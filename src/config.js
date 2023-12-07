const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');
const { Snap } = require('midtrans-client');

const firebaseConfig = {
  apiKey: "AIzaSyCHDkZ5dfjnSSP7AvJCr4pEdySXQnwfRR8",
  authDomain: "digitalart-35c0a.firebaseapp.com",
  projectId: "digitalart-35c0a",
  storageBucket: "digitalart-35c0a.appspot.com",
  messagingSenderId: "1073631656169",
  appId: "1:1073631656169:web:aecbbc3121a700c4739878",
  measurementId: "G-SGG9P463J1"
};

const snap = new Snap({
  isProduction: false,
  serverKey: 'SB-Mid-server-W8Yo8dJWaYrWCYKDVd3L0bCO',
  clientKey: 'SB-Mid-client-zvycud_ORH9DeW03',
});

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

const UserCollection = "users";
const ArtCollection = "art";
const bookmarkCollection = "bookmark";
const transaksiCollection = "transaksi_art";
const commisionJobCollection="commision_job";
const hiredJobCollection="hired_job";
const trackingArtCollection="tracking_art";

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
  snap,
};
