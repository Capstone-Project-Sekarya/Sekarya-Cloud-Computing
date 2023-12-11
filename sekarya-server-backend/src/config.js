const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');
const { Snap } = require('midtrans-client');
const { getStorage } = require('firebase/storage');
const  firebase  = require('../private/firebase.json');
const { serverKey } = require('../private/key.json').serverKey;
const { clientKey } = require('../private/key.json').clientKey;


const firebaseConfig = firebase


const snap = new Snap({
  isProduction: false,
  serverKey:serverKey,
  clientKey:clientKey
});


const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);


const UserCollection = "users";
const ArtCollection = "art";
const bookmarkCollection = "bookmark";
const transaksiCollection = "transaksi_art";
const commisionJobCollection="commision_job";
const hiredJobCollection="hired_job";
const trackingArtCollection="tracking_art";
const revisionCollection="revision_tracking";
const perantaraCollection="perantara";
const listFotoCollection="listFoto";



module.exports = {
  auth,
  firestore,
  UserCollection,
  firebaseApp,
  ArtCollection,
  bookmarkCollection,
  transaksiCollection,
  commisionJobCollection,
  hiredJobCollection,
  trackingArtCollection,
  revisionCollection,
  perantaraCollection,
  listFotoCollection,
  snap,
  storage
};