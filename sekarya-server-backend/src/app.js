const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { serverTimestamp } = require('firebase/firestore');
const { auth, firestore, UserCollection, ArtCollection,bookmarkCollection, transaksiCollection,commisionJobCollection,hiredJobCollection,trackingArtCollection, snap, revisionCollection,perantaraCollection,listFotoCollection} = require('./config');
const { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } = require('firebase/auth');
const {doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, deleteDoc } = require('firebase/firestore');
const { nanoid } = require("nanoid");
const { storage } = require('./config');
const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const multer = require('multer');
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];

const myKey = require('../private/key.json').myKey;


const validateApiKey = (req, res, next) => {
  console.log('Validating API Key');
  const apiKey = req.headers['api-key'];

  if (!apiKey || apiKey !== myKey) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  next();
};
const app = express();

app.use(validateApiKey);
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

//Autentikasi==================================================================================================================================================================
app.post('/register', async (req, res) => {
  const { username, email, password, fullName,dateOfBirth, phone, gender, age, jobCategory, bio } = req.body;
  const userId = `US-${nanoid()}`;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDocRef = doc(firestore, UserCollection, user.uid);
    await setDoc(userDocRef, {
      userId,
      username,
      email,
      fullName,
      phone,
      gender,
      age,
      jobCategory,
      dateOfBirth,
      bio,
      "customer_details": {
          "instansiBayar": null,
          "jumlahSaldo": null,
          "noRek": null,
          "portofolio": null,
          "tanggalUpdateSaldo": null,
          "userRole": null,      
        },
      listFoto:[]
    });

    res.send({ msg: 'User Added' });
  } catch (err) {
    console.error('Registration failed:', err.message);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userDocRef = doc(firestore, UserCollection, user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      res.status(200).json({ message: 'Login successful', user: { uid: user.uid, ...userData } });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

app.post('/forgotPassword', async (req, res) => {
  try {
    const { email } = req.body;

    await sendPasswordResetEmail(auth, email);

    res.status(200).json({ message: 'Reset password email sent successfully' });
  } catch (error) {
    console.error('Error sending reset password email:', error.message);
    res.status(500).json({ message: 'Error sending reset password email', error: error.message });
  }
});


//Profile==================================================================================================================================================================
app.get('/profile/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const usersCollection = collection(firestore, UserCollection);
    const q = query(usersCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      res.status(200).json({ message: 'User found', user: { userId, ...userData } });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error getting user by userId:', error.message);
    res.status(500).json({ message: 'Error getting user by userId', error: error.message });
  }
});

app.get('/getAllUsers', async (req, res) => {
  try {
    const usersCollection = collection(firestore, UserCollection);
    const querySnapshot = await getDocs(usersCollection);

    const usersData = [];

    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      usersData.push(userData);
    });

    res.status(200).json({ message: 'All users retrieved', users: usersData });
  } catch (error) {
    console.error('Error getting all users:', error.message);
    res.status(500).json({ message: 'Error getting all users', error: error.message });
  }
});

app.put('/updateProfile/:userId', upload.single('photoProfile'), async (req, res) => {
  try {
    const userId = req.params.userId;
    const userDataToUpdate = req.body;
    const file = req.file;

    if (file) {
      const fileExt = file.originalname.split('.').pop().toLowerCase();
      const contentType = allowedImageTypes.includes(`image/${fileExt}`) ? `image/${fileExt}` : 'image/jpeg';

      const storageRef = ref(storage, `profilePhotos/${userId}/${file.originalname}`);

      const metadata = {
        contentType: contentType,
      };

      await uploadBytes(storageRef, file.buffer, metadata);


      const photoProfile = await getDownloadURL(storageRef);

      userDataToUpdate.photoProfile = photoProfile;
    }

    const usersCollection = collection(firestore, UserCollection);
    const q = query(usersCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userDocRef = querySnapshot.docs[0].ref;
    await updateDoc(userDocRef, userDataToUpdate);

    res.status(200).json({ message: 'User updated successfully', photoProfile: userDataToUpdate.photoProfile });
  } catch (error) {
    console.error('Error updating user:', error.message);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});
//set list foto 
app.post('/addArtToProfile', upload.single('artPhoto'), async (req, res) => {
  const {
    tags,
    userId,
  } = req.body;

  const uploadDate = new Date().toISOString();
  const listId = `AR-${nanoid()}`;
  const file = req.file;

  // Periksa apakah file ada
  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    // Periksa apakah file.originalname ada
    if (!file.originalname) {
      return res.status(400).json({ message: 'File has no original name' });
    }

    const fileExt = file.originalname.split('.').pop().toLowerCase();
    const contentType = allowedImageTypes.includes(`image/${fileExt}`) ? `image/${fileExt}` : 'image/jpeg';

    const storageRef = ref(storage, `listPhotos/${listId}/${file.originalname}`);

    // Tambahkan header Content-Type saat mengunggah
    const metadata = {
      contentType: contentType,
    };

    await uploadBytes(storageRef, file.buffer, metadata);

    const photoUrl = await getDownloadURL(storageRef);

    const listDocRef = await addDoc(collection(firestore, listFotoCollection), {
      listId: listId,
      photoUrl: photoUrl,
      tags: tags,
      userId: userId,
      uploadDate: uploadDate,
    });

    res.send({ msg: 'Foto Ditambahkan', photoUrl: photoUrl });
  } catch (err) {
    console.error('Penambahan foto gagal:', err.message);
    res.status(500).json({ message: 'Penambahan foto gagal', error: err.message });
  }
});

app.get('/artProfile/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const listCollection = collection(firestore, listFotoCollection);
    const q = query(listCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userData = [];
      
      querySnapshot.forEach((doc) => {
        userData.push({ userId, ...doc.data() });
      });

      res.status(200).json({ message: 'foto found', user: userData });
    } else {
      res.status  (404).json({ message: 'foto not found' });
    }
  } catch (error) {
    console.error('Error getting user by userId:', error.message);
    res.status(500).json({ message: 'Error getting user by userId', error: error.message });
  }
});


app.get('/detailFoto/:listId', async (req, res) => {
  try {
    const id_art = req.params.listId;
    const listCollection = collection(firestore, listFotoCollection);
    const q = query(listCollection, where('listId', '==', id_art));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();

      res.status(200).json({
        message: 'foto found',
        art: {...data }
      });
    } else {
      res.status(404).json({ message: 'foto not found' });
    }
  } catch (error) {
    console.error('Error getting art by artId:', error.message);
    res.status(500).json({ message: 'Error getting art by artId', error: error.message });
  }
});
//==================================================================================================================================================================

//Art==================================================================================================================================================================
app.post('/addArt', upload.single('artPhoto'), async (req, res) => {
  const {
    artName,
    tags,
    artDescription,
    userId,
  } = req.body;

  const uploadDate = new Date().toISOString();
  const artId = `AR-${nanoid()}`;
  const file = req.file;

  // Periksa apakah file ada
  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    // Periksa apakah file.originalname ada
    if (!file.originalname) {
      return res.status(400).json({ message: 'File has no original name' });
    }

    const fileExt = file.originalname.split('.').pop().toLowerCase();
    const contentType = allowedImageTypes.includes(`image/${fileExt}`) ? `image/${fileExt}` : 'image/jpeg';

    const storageRef = ref(storage, `artPhotos/${artId}/${file.originalname}`);

    // Tambahkan header Content-Type saat mengunggah
    const metadata = {
      contentType: contentType,
    };

    await uploadBytes(storageRef, file.buffer, metadata);

    const downloadURL = await getDownloadURL(storageRef);

    const artDocRef = await addDoc(collection(firestore, ArtCollection), {
      artId: artId,
      artName: artName,
      tags: tags,
      artPhoto: downloadURL,
      artDescription: artDescription,
      userId: userId,
      uploadDate: uploadDate,
      likedBy: [],
      viewedBy: [],
    });

    res.send({ msg: 'Seni Ditambahkan', artPhoto: downloadURL });
  } catch (err) {
    console.error('Penambahan seni gagal:', err.message);
    res.status(500).json({ message: 'Penambahan gagal', error: err.message });
  }
});

app.get('/getAllArt', async (req, res) => {
  try {
    const art = collection(firestore, ArtCollection);
    const artSnapshot = await getDocs(art);

    const allArt = [];
    artSnapshot.forEach((doc) => {
      const artData = doc.data();
      const likes = Array.isArray(artData.likedBy) ? artData.likedBy.length : 0;
      const views = Array.isArray(artData.viewedBy) ? artData.viewedBy.length : 0;

      const artInfo = {
        artId: artData.artId,
        artName: artData.artName,
        tags: artData.tags,
        artPrice: artData.artPrice,
        artPhoto: artData.artPhoto,
        artDescription: artData.artDescription,
        userId: artData.userId,
        uploadDate: artData.uploadDate,
        likes,
        views,
        likedBy: artData.likedBy || [],
        viewedBy: artData.viewedBy || [],
      };

      allArt.push(artInfo);
    });

    res.status(200).json(allArt);
  } catch (error) {
    console.error('Error fetching all art:', error.message);
    res.status(500).json({ message: 'Error fetching all art', error: error.message });
  }
});

//ngeliat art berdasarkan tags
app.get('/artByTags/:tags', async (req, res) => {
  try {
    const tags = req.params.tags;
    const artsCollection = collection(firestore, ArtCollection);
    const q = query(artsCollection, where('tags', '==', tags));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const artData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const likes = Array.isArray(data.likedBy) ? data.likedBy.length : 0;
        const views = Array.isArray(data.viewedBy) ? data.viewedBy.length : 0;

        artData.push({ ...data, likes, views });
      });
      res.status(200).json({ message: 'Art found', arts: artData });
    } else {
      res.status(404).json({ message: 'Art not found for these tags' });
    }
  } catch (error) {
    console.error('Error getting art by tags:', error.message);
    res.status(500).json({ message: 'Error getting art by tags', error: error.message });
  }
});

app.get('/artByUser/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const artsCollection = collection(firestore, ArtCollection);
    const q = query(artsCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const artData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const likes = Array.isArray(data.likedBy) ? data.likedBy.length : 0;
        const views = Array.isArray(data.viewedBy) ? data.viewedBy.length : 0;

        artData.push({ ...data, likes, views });
      });
      res.status(200).json({ message: 'Art found', arts: artData });
    } else {
      res.status(404).json({ message: 'Art not found for this user' });
    }
  } catch (error) {
    console.error('Error getting art by userId:', error.message);
    res.status(500).json({ message: 'Error getting art by userId', error: error.message });
  }
});

app.get('/detailArt/:artId', async (req, res) => {
  try {
    const id_art = req.params.artId;
    const artsCollection = collection(firestore, ArtCollection);
    const q = query(artsCollection, where('artId', '==', id_art));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      const likes = Array.isArray(data.likedBy) ? data.likedBy.length : 0;
      const views = Array.isArray(data.viewedBy) ? data.viewedBy.length : 0;

      res.status(200).json({
        message: 'Art found',
        art: {...data, likes, views }
      });
    } else {
      res.status(404).json({ message: 'Art not found' });
    }
  } catch (error) {
    console.error('Error getting art by artId:', error.message);
    res.status(500).json({ message: 'Error getting art by artId', error: error.message });
  }
});

app.put('/updateArt/:artId', async (req, res) => {
  try {
    const artId= req.params.artId;
    const artDataToUpdate = req.body;

    const artsCollection = collection(firestore, ArtCollection);
    const q = query(artsCollection, where('artId', '==', artId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ message: 'art not found' });
    }

    const artDocRef = querySnapshot.docs[0].ref;
    await updateDoc(artDocRef, artDataToUpdate);

    res.status(200).json({ message: 'art updated successfully' });
  } catch (error) {
    console.error('Error updating art:', error.message);
    res.status(500).json({ message: 'Error updating art', error: error.message });
  }
});

app.delete('/deleteArt/:artId', async (req, res) => {
  try {
    const artId = req.params.artId;

    const artCollection = collection(firestore, ArtCollection);
    const q = query(artCollection, where('artId', '==', artId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ message: 'Art not found' });
    }

    const art = querySnapshot.docs[0].id;

    const artDocRef = doc(firestore, ArtCollection, art);
    await deleteDoc(artDocRef);

    res.status(200).json({ message: 'Art deleted successfully' });
  } catch (error) {
    console.error('Error deleting art:', error.message);
    res.status(500).json({ message: 'Error deleting art', error: error.message });
  }
});

app.post('/likeArt/:artId', async (req, res) => {
  const artId = req.params.artId;
  const userId = req.body.userId;

  try {
    const artDocRef = collection(firestore, ArtCollection);
    const q = query(artDocRef, where('artId', '==', artId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const artDoc = querySnapshot.docs[0];
      const updatedLikes = artDoc.data().likes + 1;
      const likedBy = artDoc.data().likedBy || [];

      if (!likedBy.includes(userId)) {
        likedBy.push(userId);
        await updateDoc(artDoc.ref, { likes: updatedLikes, likedBy });
        res.send({ msg: 'Art Liked', likes: updatedLikes });
      } else {
        res.send({ msg: 'Art Already Liked' });
      }
    } else {
      res.status(404).json({ message: 'Art not found' });
    }
  } catch (err) {
    console.error('Like failed:', err.message);
    res.status(500).json({ message: 'Like failed', error: err.message });
  }
});

app.post('/unlikeArt/:artId', async (req, res) => {
  const artId = req.params.artId;
  const userId = req.body.userId;

  try {
    const artDocRef = collection(firestore, ArtCollection);
    const q = query(artDocRef, where('artId', '==', artId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const artDoc = querySnapshot.docs[0];
      const currentLikes = artDoc.data().likes;
      const likedBy = artDoc.data().likedBy || [];

      if (likedBy.includes(userId)) {
        // User has liked the art, proceed to unlike
        const updatedLikes = currentLikes - 1;
        const updatedLikedBy = likedBy.filter(id => id !== userId);

        await updateDoc(artDoc.ref, { likes: updatedLikes, likedBy: updatedLikedBy });
        res.send({ msg: 'Art Unliked', likes: updatedLikes });
      } else {
        res.send({ msg: 'Art Not Liked' });
      }
    } else {
      res.status(404).json({ message: 'Art not found' });
    }
  } catch (err) {
    console.error('Unlike failed:', err.message);
    res.status(500).json({ message: 'Unlike failed', error: err.message });
  }
});

app.post('/viewArt/:artId', async (req, res) => {
  const artId = req.params.artId;
  const userId = req.body.userId;

  try {
    const artDocRef = collection(firestore, ArtCollection);
    const q = query(artDocRef, where('artId', '==', artId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const artDoc = querySnapshot.docs[0];
      const updatedViews = artDoc.data().views + 1;
      const viewedBy = artDoc.data().viewedBy || [];

      if (!viewedBy.includes(userId)) {
        viewedBy.push(userId);
        await updateDoc(artDoc.ref, { views: updatedViews, viewedBy });
        res.send({ msg: 'Art Viewed', views: updatedViews });
      } else {
        res.send({ msg: 'Art Already Viewed' });
      }
    } else {
      res.status(404).json({ message: 'Art not found' });
    }
  } catch (err) {
    console.error('View failed:', err.message);
    res.status(500).json({ message: 'View failed', error: err.message });
  }
});



//==================================================================================================================================================================

//Bookmark==================================================================================================================================================================
app.post('/addBookmark', async (req, res) => {
  try {
    const { userId, artId } = req.body;

    const bookmarksCollection = collection(firestore, bookmarkCollection);
    const q = query(bookmarksCollection, where('userId', '==', userId), where('artId', '==', artId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return res.status(400).json({ message: 'Art is already bookmarked by the user' });
    }


    const bookmarkDocRef = await addDoc(bookmarksCollection, {
      userId,
      artId,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({ message: 'Bookmark added successfully' });
  } catch (error) {
    console.error('Error adding bookmark:', error.message);
    res.status(500).json({ message: 'Error adding bookmark', error: error.message });
  }
});

app.get('/bookmarkByUser/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const bookmarksCollection = collection(firestore, bookmarkCollection);
    const q = query(bookmarksCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ message: 'No bookmarks found for this user' });
    }

    const bookmarksData = [];
    for (const doc of querySnapshot.docs) {
      const bookmark = doc.data();
      const artId = bookmark.artId;
          
      const artsCollection = collection(firestore, ArtCollection);
      const artQuery = query(artsCollection, where('artId', '==', artId));
      const artQuerySnapshot = await getDocs(artQuery);

      if (!artQuerySnapshot.empty) {
        const artDoc = artQuerySnapshot.docs[0];
        const artData = artDoc.data();
        bookmarksData.push({ bookmark, artData });
      }
    }

    res.status(200).json({ message: 'Bookmarks found', bookmarks: bookmarksData });
  } catch (error) {
    console.error('Error getting bookmarks:', error.message);
    res.status(500).json({ message: 'Error getting bookmarks', error: error.message });
  }
});

app.delete('/deleteBookmark/:userId/:artId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const artId = req.params.artId;
    const bookmarksCollection = collection(firestore, bookmarkCollection);
    const q = query(bookmarksCollection, where('userId', '==', userId), where('artId', '==', artId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ message: 'Bookmark not found' });
    }

    const bookmarkId = querySnapshot.docs[0].id;

    const bookmarkDocRef = doc(firestore, bookmarkCollection, bookmarkId);
    await deleteDoc(bookmarkDocRef);

    res.status(200).json({ message: 'Bookmark deleted successfully' });
  } catch (error) {
    console.error('Error deleting bookmark:', error.message);
    res.status(500).json({ message: 'Error deleting bookmark', error: error.message });
  }
});
//==================================================================================================================================================================


//===========================================================================================================================================================================

//Commision_job==================================================================================================================================================================
app.post('/createCommisionJob', async (req, res) => {
  const {
    tags,
    jobPrice,
    estimationWork,
    id_userAsArtist
  } = req.body;
    const commisionJobId = `CB-${nanoid()}`;
  const uploadDate = new Date().toISOString();
  try {
    const commisionDocRef = await addDoc(collection(firestore, commisionJobCollection), {
      commisionJobId,
      tags,
      jobPrice,
      estimationWork,
      id_userAsArtist,
      uploadDate,
    });

    res.send({ msg: 'commision job Added' });
  } catch (err) {
    console.error('commision job add failed:', err.message);
    res.status(500).json({ message: 'add failed', error: err.message });
  }
});

//melihat semua commision job yang dibuat user
app.get('/getAllcommision/:id_userAsArtist', async (req, res) => {
  try {
    const id_userAsArtist = req.params.id_userAsArtist;
    const commisionollection = collection(firestore, 'commision_job');
    const q = query(commisionollection, where('id_userAsArtist', '==', id_userAsArtist));
    const querySnapshot = await getDocs(q);

    const commisionsData = [];

    querySnapshot.forEach((doc) => {
      const commisionData = doc.data();
      commisionsData.push(commisionData);
    });

    res.status(200).json({ message: 'Commision jobs retrieved', commisionJobs: commisionsData });
  } catch (error) {
    console.error('Error getting commision jobs:', error.message);
    res.status(500).json({ message: 'Error getting commision jobs', error: error.message });
  }
});

//lihat detail commision job
app.get('/detailCommisionJob/:commisionJobId', async (req, res) => {
  try {
    const commisionId = req.params.commisionJobId;
    const commisionCollection = collection(firestore, commisionJobCollection);
    const q = query(commisionCollection, where('commisionJobId', '==', commisionId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const commisionData = querySnapshot.docs[0].data();
      res.status(200).json({ message: 'commisionJob found', user: { commisionId, ...commisionData } });
    } else {
      res.status(404).json({ message: 'commisionJob not found' });
    }
  } catch (error) {
    console.error('Error getting user by userId:', error.message);
    res.status(500).json({ message: 'Error getting user by userId', error: error.message });
  }
});

//update commsion job
app.put('/updateCommisionJob/:commisionJobId', async (req, res) => {
  try {
    const commisionJobId = req.params.commisionJobId;
    const commsionJobDataToUpdate = req.body;

    const commisionJobsCollection = collection(firestore, commisionJobCollection);
    const q = query(commisionJobsCollection, where('commisionJobId', '==', commisionJobId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ message: 'Commision not found' });
    }

    const commisionDocRef = querySnapshot.docs[0].ref;
    await updateDoc(commisionDocRef, commsionJobDataToUpdate);

    res.status(200).json({ message: 'Commision updated successfully' });
  } catch (error) {
    console.error('Error updating Commision:', error.message);
    res.status(500).json({ message: 'Error updating Commision', error: error.message });
  }
});

//delete commision job
app.delete('/deleteCommisionJob/:commisionJobId', async (req, res) => {
  try {
    const commisionJobId = req.params.commisionJobId;

    const commisionsJobsCollection = collection(firestore, commisionJobCollection);
    const q = query(commisionsJobsCollection, where('commisionJobId', '==', commisionJobId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ message: 'commision not found' });
    }

    const commision = querySnapshot.docs[0].id;

    const commisionDocRef = doc(firestore, commisionJobCollection, commision);
    await deleteDoc(commisionDocRef);

    res.status(200).json({ message: 'commisionJob deleted successfully' });
  } catch (error) {
    console.error('Error deleting commisionJob:', error.message);
    res.status(500).json({ message: 'Error deleting commisionJob', error: error.message });
  }
});

//nampilin semua commision job
app.get('/getCommisionJob', async (req, res) => {
  try {
    const commisionsJobsCollection = collection(firestore, commisionJobCollection);
    const querySnapshot = await getDocs(commisionsJobsCollection);

    const comjobData = [];

    querySnapshot.forEach((doc) => {
      const commisionData = doc.data();
      comjobData.push(commisionData);
    });

    res.status(200).json({ message: 'All CommisionJobretrieved', users: comjobData});
  } catch (error) {
    console.error('Error getting all CommisionJob:', error.message);
    res.status(500).json({ message: 'Error getting all CommisionJob', error: error.message });
  }
});

// nampilin commision job berdasarkan tags
app.get('/getCommisionCategory/:tags', async (req, res) => {
  try {
    const tags = req.params.tags;
    const commisionollection = collection(firestore, 'commision_job');
    const q = query(commisionollection, where('tags', '==', tags));
    const querySnapshot = await getDocs(q);

    const commisionsData = [];

    querySnapshot.forEach((doc) => {
      const commisionData = doc.data();
      commisionsData.push(commisionData);
    });

    res.status(200).json({ message: 'Commision jobs retrieved', commisionJobs: commisionsData });
  } catch (error) {
    console.error('Error getting commision jobs:', error.message);
    res.status(500).json({ message: 'Error getting commision jobs', error: error.message });
  }
});
//=======================================================================================================================================================================

//Hired_job==================================================================================================================================================================

//pesan create job
app.post('/hired_job', upload.single('fotoArt'), async (req, res) => {
  const {
    commisionJobId, 
    deskripsi_job, 
    estimated_end, 
    id_userAsArtist,
    id_userAsCustomer,
    price
  } = req.body;
  const tanggalUpload = new Date().toISOString();
  const status_job = "on demand";
  const file = req.file;

  try {

    if (!file) {
      return res.status(400).json({ message: 'No fotoArt uploaded' });
    }

    // Memeriksa tipe gambar yang diizinkan
    const fileExt = file.originalname.split('.').pop().toLowerCase();
    const contentType = allowedImageTypes.includes(`image/${fileExt}`) ? `image/${fileExt}` : 'image/jpeg';

    const hiredJobId = `HJ-${nanoid()}`;
    const storageRef = ref(storage, `artPhotos/${hiredJobId}/${file.originalname}`);

    // Tambahkan header Content-Type saat mengunggah
    const metadata = {
      contentType: contentType,
    };

    await uploadBytes(storageRef, file.buffer, metadata);

    // Dapatkan URL publik fotoArt yang diunggah
    const fotoArtUrl = await getDownloadURL(storageRef);

    const hiredDocRef = await addDoc(collection(firestore, hiredJobCollection), {
      hiredJobId,
      commisionJobId,
      id_userAsArtist,
      id_userAsCustomer,  
      estimated_end, 
      status_job,
      tanggalUpload,
      price,
      fotoArt: fotoArtUrl,
      "deskripsi_job": {
        "nama_art": deskripsi_job.nama_art,
        "tema_art": deskripsi_job.tema_art,
        "kategori_art": deskripsi_job.kategori_art,
        "keterangan_art": deskripsi_job.keterangan_art,
      }
    });

    res.send({ msg: 'Hired job Added', fotoArt: fotoArtUrl });
  } catch (err) {
    console.error('Hired job add failed:', err.message);
    res.status(500).json({ message: 'Add failed', error: err.message });
  }
});

//nampilin data hired job ke costumer
app.get('/hiredJobToCs/:id_userAsCustomer/:status_job', async (req, res) => {
  try {
    const idCustomer = req.params.id_userAsCustomer;
    const idStatus = req.params.status_job;
    const hiredCollection = collection(firestore, hiredJobCollection);
    const q = query(hiredCollection, where('id_userAsCustomer', '==', idCustomer), where('status_job', '==', idStatus));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const hiredData = querySnapshot.docs[0].data();
      res.status(200).json({ message: 'hired job found', tracking: { idCustomer, ...hiredData } });
    } else {
      res.status(404).json({ message: 'hired job not found' });
    }
  } catch (error) {
    console.error('Error hired job:', error.message);
    res.status(500).json({ message: 'Error getting hired job', error: error.message });
  }
});

//nampilin data hired job ke artist
app.get('/hiredJobToArtist/:id_userAsArtist', async (req, res) => {
  try {
    const id_userAsArtist = req.params.id_userAsArtist;

    const hiredJobsCollection = collection(firestore, hiredJobCollection);
    const q = query(hiredJobsCollection, where('id_userAsArtist', '==', id_userAsArtist));
    
    const hiredJobsSnapshot = await getDocs(q);

    const hiredJobsData = [];
    hiredJobsSnapshot.forEach((doc) => {
      const hiredJob = doc.data();
      hiredJobsData.push(hiredJob);
    });


    res.status(200).json({ message: 'Hired Jobs found', hiredJobs: hiredJobsData });
  } catch (error) {
    console.error('Error fetching Hired Jobs:', error.message);
    res.status(500).json({ message: 'Error fetching Hired Jobs', error: error.message });
  }
});

// accept or reject hiredJob
app.put('/statusHiredJob/:hiredJobId', async (req, res) => {
  try {
    const hiredJobId = req.params.hiredJobId;
    const hiredJobDataToUpdate = req.body;

    const hiredCollection = collection(firestore, hiredJobCollection);
    const q = query(hiredCollection, where('hiredJobId', '==', hiredJobId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ message: 'hired job not found' });
    }

    const hireDocRef = querySnapshot.docs[0].ref;
    await updateDoc(hireDocRef, hiredJobDataToUpdate);

    res.status(200).json({ message: 'status hired job updated successfully' });
  } catch (error) {
    console.error('Error updating status hired job:', error.message);
    res.status(500).json({ message: 'Error updating status hired job', error: error.message });
  }
});

//Tracking Art=====================================================================================================================================================================
app.post('/addTrackingArt', async (req, res) => {
  const {
    kategori_tracking,
    deskripsi_tracking,
    hiredJobId,
    imageTracking,
    id_userAsArtist,
    id_userAsCustomer
  } = req.body;

  const trackingArtId = `TR-${nanoid()}`;
  const tanggal_tracking = new Date().toISOString();
  try {
    const trackingDocRef = await addDoc(collection(firestore, trackingArtCollection), {
      kategori_tracking,
      deskripsi_tracking,
      hiredJobId,
      tanggal_tracking,
      imageTracking,
      id_userAsArtist,
      id_userAsCustomer,
      trackingArtId,
      revision: []
    });

    res.send({ msg: 'tracking art Added' });
  } catch (err) {
    console.error('tracking art add failed:', err.message);
    res.status(500).json({ message: 'add failed', error: err.message });
  }
});

//nampilin tracking art job ke costumer
app.get('/trackingToCs/:id_userAsCustomer/:hiredJobId', async (req, res) => {
  try {
    const idCustomer = req.params.id_userAsCustomer;
    const idHiredJob = req.params.hiredJobId;
    const trackingCollection = collection(firestore, trackingArtCollection);
    const q = query(trackingCollection, where('id_userAsCustomer', '==', idCustomer), where('hiredJobId', '==', idHiredJob));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const trackingData = querySnapshot.docs[0].data();
      res.status(200).json({ message: 'Tracking found', tracking: { idCustomer, ...trackingData } });
    } else {
      res.status(404).json({ message: 'Tracking not found' });
    }
  } catch (error) {
    console.error('Error getting Tracking:', error.message);
    res.status(500).json({ message: 'Error getting art by artId', error: error.message });
  }
});

//nampilin tracking art job ke artist
app.get('/trackingToArtist/:id_userAsArtist/:hiredJobId', async (req, res) => {
  try {
    const idArtist = req.params.id_userAsArtist;
    const idHiredJob = req.params.hiredJobId;
    const trackingCollection = collection(firestore, trackingArtCollection);
    const q = query(trackingCollection, where('id_userAsArtist', '==', idArtist), where('hiredJobId', '==', idHiredJob));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const trackingData = querySnapshot.docs[0].data();
      res.status(200).json({ message: 'Tracking found', tracking: { idArtist, ...trackingData } });
    } else {
      res.status(404).json({ message: 'Tracking not found' });
    }
  } catch (error) {
    console.error('Error getting Tracking:', error.message);
    res.status(500).json({ message: 'Error getting art by artId', error: error.message });
  }
});

app.post('/revisi', async (req, res) => {
  const {
    revision_note,
    trackingArtId,
    id_userAsArtist,
    id_userAsCustomer
  } = req.body;
  const revisionId = `RV-${nanoid()}`;
  try {
    const revisionDocRef = await addDoc(collection(firestore, revisionCollection), {
      revisionId,
      revision_note,
      id_userAsArtist,
      id_userAsCustomer,
      trackingArtId
    });

    const perantaraDocRef = await addDoc(collection(firestore, perantaraCollection), {
      revisionId,
      trackingArtId
    });

    res.send({ msg: 'revision progress Added' });
  } catch (err) {
    console.error('revision progress add failed:', err.message);
    res.status(500).json({ message: 'add failed', error: err.message });
  }
});

app.get('/showRevision/:trackingArtId', async (req, res) => {
  try {
    const trackingArtId = req.params.trackingArtId;

    const helperCollection = collection(firestore, perantaraCollection);
    const q = query(helperCollection, where('trackingArtId', '==', trackingArtId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ message: 'No tracking found' });
    }

    const revisionData = [];
    for (const doc of querySnapshot.docs) {
      const revision = doc.data();
      const revisionId = revision.revisionId; 
          
      const revCollection = collection(firestore, revisionCollection);
      const artQuery = query(revCollection, where('revisionId', '==', revisionId));
      const artQuerySnapshot = await getDocs(artQuery);

      if (!artQuerySnapshot.empty) {
        const revDoc = artQuerySnapshot.docs[0];
        const revData = revDoc.data();
        revisionData.push({ revision, revData });
      }
    }

    res.status(200).json({ message: 'revision found', revision: revisionData });
  } catch (error) {
    console.error('Error getting revision:', error.message);
    res.status(500).json({ message: 'Error getting revision', error: error.message });
  }
});

//Pembayaran==================================================================================================================================================================
app.post('/create-payment', async (req, res) => {
  try {
    const {
      grossAmount,
      itemDetails,
      customerDetails
    } = req.body;

    const orderId = `DG-${uuidv4()}`;

    const transactionToken = await snap.createTransactionToken({
      transaction_details: {
        "order_id": orderId,
        "gross_amount": grossAmount,
      },
      "item_details": [{
        "id": itemDetails.idHired ,
        "price": itemDetails.price ,
        "quantity": itemDetails.quantity,
        "name": itemDetails.name,
        "category": itemDetails.category,
      }],
      "customer_details": {
        "first_name": customerDetails.first_name,
        "last_name": customerDetails.last_name,
        "email": customerDetails.email,
        "anjay": customerDetails.phone,
      }
    });

    const paymentDocRef = await addDoc(collection(firestore, transaksiCollection), {
      orderId,
      grossAmount,
      itemDetails,
      customerDetails,
      status: 'pending', 
      timestamp: serverTimestamp(),
    });


    res.json({ token: transactionToken, orderId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
//=======================================================================================================================================================================


module.exports = app;
