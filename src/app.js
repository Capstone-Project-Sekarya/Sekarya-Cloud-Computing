const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { serverTimestamp } = require('firebase/firestore');
const { auth, firestore, UserCollection, ArtCollection,bookmarkCollection, transaksiCollection,commisionJobCollection,hiredJobCollection,trackingArtCollection, snap} = require('./config');
const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, deleteDoc } = require('firebase/firestore');
const { nanoid } = require("nanoid");
const app = express();

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

//Autentikasi==================================================================================================================================================================
app.post('/register', async (req, res) => {
  const { username, email, password, fullName,dateOfBirth, phone, gender, age, jobCategory, bio } = req.body;
  const idUser = `US-${nanoid()}`;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDocRef = doc(firestore, UserCollection, user.uid);
    await setDoc(userDocRef, {
      idUser,
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
        }
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


//Profile==================================================================================================================================================================
app.get('/profile/:idUser', async (req, res) => {
  try {
    const idUser = req.params.idUser;
    const usersCollection = collection(firestore, UserCollection);
    const q = query(usersCollection, where('idUser', '==', idUser));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      res.status(200).json({ message: 'User found', user: { idUser, ...userData } });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error getting user by idUser:', error.message);
    res.status(500).json({ message: 'Error getting user by idUser', error: error.message });
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


app.put('/updateUser/:email', async (req, res) => {
  try {
    const userEmail = req.params.email;
    const userDataToUpdate = req.body;

    const usersCollection = collection(firestore, UserCollection);
    const q = query(usersCollection, where('email', '==', userEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ message: 'User not found' });
    }


    const userId = querySnapshot.docs[0].id;


    const userDocRef = doc(firestore, UserCollection, userId);
    await updateDoc(userDocRef, userDataToUpdate);

    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error.message);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
});
//==================================================================================================================================================================

//Art==================================================================================================================================================================
app.post('/addArt', async (req, res) => {
  const {namaArt, temaArt, hargaArt, fotoArt, deskripsiArt, idUser, kategoriArt } = req.body;
  const tanggalUpload = new Date().toISOString();
  const idArt = `AR-${uuidv4()}`;
  try {
    const artDocRef = await addDoc(collection(firestore, ArtCollection), {
      idArt,
      namaArt,
      temaArt,
      hargaArt,
      fotoArt,
      kategoriArt,
      deskripsiArt,
      idUser,
      tanggalUpload,
    });

    res.send({ msg: 'art Added' });
  } catch (err) {
    console.error('art add failed:', err.message);
    res.status(500).json({ message: 'add failed', error: err.message });
  }
});

app.get('/getAllArt', async (req, res) => {
  try {
    const artCollection = collection(firestore, ArtCollection);
    const querySnapshot = await getDocs(artCollection);

    const artDataList = [];

    querySnapshot.forEach((doc) => {
      const artData = doc.data();
      artDataList.push({
        id: doc.id,
        namaArt: artData.namaArt,
        temaArt: artData.temaArt,
        hargaArt: artData.hargaArt,
        fotoArt: artData.fotoArt,
        kategoriArt: artData.kategoriArt,
        deskripsiArt: artData.deskripsiArt,
        idUser: artData.idUser,
        tanggalUpload: artData.tanggalUpload,
      });
    });

    res.status(200).json({ message: 'All art retrieved', artList: artDataList });
  } catch (error) {
    console.error('Error getting all art:', error.message);
    res.status(500).json({ message: 'Error getting all art', error: error.message });
  }
});

app.put('/updateArt/:namaArt', async (req, res) => {
  try {
    const namaArt = req.params.namaArt;
    const artDataToUpdate = req.body;

    const artCollection = collection(firestore, ArtCollection);
    const q = query(artCollection, where('namaArt', '==', namaArt));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ message: 'Art not found' });
    }

    const artId = querySnapshot.docs[0].id;

    const artDocRef = doc(firestore, ArtCollection, artId);  // Perbaikan di sini
    await updateDoc(artDocRef, artDataToUpdate);

    res.status(200).json({ message: 'Art updated successfully' });
  } catch (error) {
    console.error('Error updating art:', error.message);
    res.status(500).json({ message: 'Error updating art', error: error.message });
  }
});

app.delete('/deleteArt/:namaArt', async (req, res) => {
  try {
    const namaArt = req.params.namaArt;

    const artCollection = collection(firestore, ArtCollection);
    const q = query(artCollection, where('namaArt', '==', namaArt));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ message: 'Art not found' });
    }

    const artId = querySnapshot.docs[0].id;

    const artDocRef = doc(firestore, ArtCollection, artId);
    await deleteDoc(artDocRef);

    res.status(200).json({ message: 'Art deleted successfully' });
  } catch (error) {
    console.error('Error deleting art:', error.message);
    res.status(500).json({ message: 'Error deleting art', error: error.message });
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

app.get('/getBookmark/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const bookmarksCollection = collection(firestore, bookmarkCollection);
    const q = query(bookmarksCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ message: 'Bookmarks not found for the user' });
    }
    const artIds = querySnapshot.docs.map((doc) => doc.data().artId);
    const artDetails = [];

    for (const artId of artIds) {
      const artCollection = collection(firestore, ArtCollection);
      const artDocRef = doc(firestore, ArtCollection, artId);
      const artDoc = await getDoc(artDocRef);

      if (artDoc.exists()) {
        const artData = artDoc.data();
        artDetails.push({ artId, ...artData });
      }
    }
    res.status(200).json({ message: 'Bookmarks with Art details retrieved', bookmarks: artDetails });
  } catch (error) {
    console.error('Error getting bookmarks with art details:', error.message);
    res.status(500).json({ message: 'Error getting bookmarks with art details', error: error.message });
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

    const bookmarkDocRef = doc(firestore, 'bookmark', bookmarkId);
    await deleteDoc(bookmarkDocRef);

    res.status(200).json({ message: 'Bookmark deleted successfully' });
  } catch (error) {
    console.error('Error deleting bookmark:', error.message);
    res.status(500).json({ message: 'Error deleting bookmark', error: error.message });
  }
});
//==================================================================================================================================================================

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
        "id": itemDetails.id ,
        "price": itemDetails.price ,
        "quantity": itemDetails.quantity,
        "name": itemDetails.name,
        "category": itemDetails.category,
      }],
      "customer_details": {
        "first_name": customerDetails.first_name,
        "last_name": customerDetails.last_name,
        "email": customerDetails.email,
        "phone": customerDetails.phone,
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
//===========================================================================================================================================================================

//Commision_job==================================================================================================================================================================
app.post('/commision_job', async (req, res) => {
  const {category_job,
    price_job,
    estimation_work,
    id_userAsArtist} = req.body;
  const tanggalUpload = new Date().toISOString();
  try {
    const commisionDocRef = await addDoc(collection(firestore, commisionJobCollection), {
      category_job,
      price_job,
      estimation_work,
      id_userAsArtist,
      tanggalUpload,
    });

    res.send({ msg: 'commision job Added' });
  } catch (err) {
    console.error('commision job add failed:', err.message);
    res.status(500).json({ message: 'add failed', error: err.message });
  }
});

app.get('/getAllcommision/:id_userAsArtist', async (req, res) => {
  try {
    const id_userAsArtist = req.params.id_userAsArtist;

    // Membuat kueri untuk mendapatkan commision_job berdasarkan id_userAsArtist
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

app.get('/commision-job/:id', async (req, res) => {
  try {
    const commisionJobId = req.params.id;

    const commisionJobDocRef = doc(firestore, commisionJobCollection, commisionJobId);
    
    const commisionJobSnapshot = await getDoc(commisionJobDocRef);

    if (commisionJobSnapshot.exists()) {
      const commisionJobData = commisionJobSnapshot.data();

      res.status(200).json({ message: 'Commision Job found', commisionJob: commisionJobData });
    } else {
      res.status(404).json({ message: 'Commision Job not found' });
    }
  } catch (error) {
    console.error('Error fetching Commision Job:', error.message);
    res.status(500).json({ message: 'Error fetching Commision Job', error: error.message });
  }
});

app.put('/commision_job/:commisionJobId', async (req, res) => {
  const commisionJobId = req.params.commisionJobId;
  const { category_job, price_job, estimation_work, id_userAsArtist } = req.body;

  try {

    const commisionDocRef = doc(firestore, commisionJobCollection, commisionJobId);


    const commisionDocSnapshot = await getDoc(commisionDocRef);

    if (!commisionDocSnapshot.exists()) {
      return res.status(404).json({ message: 'Commision job not found' });
    }

    await updateDoc(commisionDocRef, {
      category_job,
      price_job,
      estimation_work,
      id_userAsArtist,
    });

    res.status(200).json({ message: 'Commision job updated successfully' });
  } catch (error) {
    console.error('Error updating Commision job:', error.message);
    res.status(500).json({ message: 'Error updating Commision job', error: error.message });
  }
});

app.delete('/commision_job/:commisionJobId', async (req, res) => {
  const commisionJobId = req.params.commisionJobId;

  try {
    // Mendapatkan referensi dokumen commision_job berdasarkan ID
    const commisionDocRef = doc(firestore, 'commision_job', commisionJobId);

    // Memeriksa apakah dokumen ada
    const commisionDocSnapshot = await getDoc(commisionDocRef);

    if (!commisionDocSnapshot.exists()) {
      return res.status(404).json({ message: 'Commision job not found' });
    }

    // Melakukan penghapusan pada dokumen commision_job
    await deleteDoc(commisionDocRef);

    res.status(200).json({ message: 'Commision job deleted successfully' });
  } catch (error) {
    console.error('Error deleting Commision job:', error.message);
    res.status(500).json({ message: 'Error deleting Commision job', error: error.message });
  }
});
//=======================================================================================================================================================================

//Hired_job==================================================================================================================================================================
app.post('/hired_job', async (req, res) => {
  const {
    id_commisionJob, 
    deskripsi_job, 
    estimated_end, 
    status_job, 
    id_userAsArtist,
    id_userAsCustomer
  } = req.body;
  const hiredJobId = `HJ-${uuidv4()}`;
  const tanggalUpload = new Date().toISOString();
  try {
    const hiredDocRef = await addDoc(collection(firestore, hiredJobCollection), {
      hiredJobId,
      id_commisionJob,
      id_userAsArtist,
      id_userAsCustomer,  
      estimated_end, 
      status_job,
      tanggalUpload,
      "deskripsi_job": {
        "nama_art": deskripsi_job.nama_art,
        "tema_art": deskripsi_job.tema_art,
        "kategori_art": deskripsi_job.kategori_art,
        "keterangan_art": deskripsi_job.keterangan_art,
      }
    });

    res.send({ msg: 'hired job Added' });
  } catch (err) {
    console.error('hired job add failed:', err.message);
    res.status(500).json({ message: 'add failed', error: err.message });
  }
});

app.get('/hiredjobs/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const hiredJobsCollection = collection(firestore, hiredJobCollection);
    const q = query(hiredJobsCollection, where('userId', '==', userId));
    
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

app.post('/tracking_art', async (req, res) => {
  const {
    kategori_tracking,
    deskripsi_tracking,
    id_hired_job,
  } = req.body;
  const tanggal_tracking = new Date().toISOString();
  try {
    const trackingDocRef = await addDoc(collection(firestore, trackingArtCollection), {
      kategori_tracking,
      deskripsi_tracking,
      id_hired_job,
      tanggal_tracking,
    });

    res.send({ msg: 'tracking art Added' });
  } catch (err) {
    console.error('tracking art add failed:', err.message);
    res.status(500).json({ message: 'add failed', error: err.message });
  }
});





module.exports = app;
