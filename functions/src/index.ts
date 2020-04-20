import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import * as express from './functions/express';
import * as firestore from './functions/firestore';


export const api = functions.https.onRequest(express.app);

let db = admin.firestore();
export const updateDb = (_db) => {
  db = _db;
}

export const orderCreate = functions.firestore.document('restaurants/{restaurantId}/orders/{orderId}').onCreate(async (snapshot, context) => {
  await firestore.orderCreate(db, snapshot, context);
});

/*
export const createRestaurant = functions.https.onCall(async (data, context) => {
	return await firestore.createRestaurant(db, data, context);
});
*/

import * as Order from './functions/order';
export const orderUpdate = functions.https.onCall(async (data, context) => {
  return await Order.update(db, data, context);
});

import * as Stripe from './stripe'
export const stripe = { ...Stripe }

import * as Checkout from './stripe/checkout'

// export const checkout = { ...Checkout }
export const checkoutCreate = functions.https.onCall(async (data, context) => {
  return await Checkout.create(data, context);
});

export const checkoutConfirm = functions.https.onCall(async (data, context) => {
  return await Checkout.confirm(data, context);
});

export const checkoutCancel = functions.https.onCall(async (data, context) => {
  return await Checkout.cancel(data, context);
});

