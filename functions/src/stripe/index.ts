import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe'

export const connect = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated.')
  }
  const STRIPE_SECRET_KEY = functions.config().stripe.secret_key
  if (!STRIPE_SECRET_KEY) {
    throw new functions.https.HttpsError('invalid-argument', 'The functions requires STRIPE_SECRET_KEY.')
  }
  const code = data.code
  if (!code) {
    throw new functions.https.HttpsError('invalid-argument', 'This request does not include an code.')
  }
  const uid: string = context.auth.uid
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2020-03-02' })
  try {
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code
    });

    const batch = admin.firestore().batch()
    batch.set(
      admin.firestore().doc(`/admins/${uid}/system/stripe`),
      response
    )
    batch.set(
      admin.firestore().doc(`/admins/${uid}/public/stripe`),
      {
        isConnected: true,
        stripeAccount: response.stripe_user_id
      }
    )

    await batch.commit()
    return { result: response }
  } catch (error) {
    console.error(error)
    throw error
  }
});

export const disconnect = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated.')
    }
    const STRIPE_SECRET_KEY = functions.config().stripe.secret_key
    if (!STRIPE_SECRET_KEY) {
      throw new functions.https.HttpsError('invalid-argument', 'The functions requires STRIPE_SECRET_KEY.')
    }
    const STRIPE_CLIENT_ID = data.STRIPE_CLIENT_ID
    if (!STRIPE_CLIENT_ID) {
      throw new functions.https.HttpsError('invalid-argument', 'The functions requires STRIPE_CLIENT_ID.')
    }
    const uid: string = context.auth.uid
    const snapshot = await admin.firestore().doc(`/admins/${uid}/system/stripe`).get()
    const systemStripe = snapshot.data()
    if (!systemStripe) {
      throw new functions.https.HttpsError('invalid-argument', 'This account is not connected to Stripe.')
    }
    const stripe_user_id = systemStripe.stripe_user_id
    if (!systemStripe.stripe_user_id) {
      throw new functions.https.HttpsError('invalid-argument', 'This account is not connected to Stripe.')
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2020-03-02' })

    let response = {}
    try {
      response = await stripe.oauth.deauthorize({
        client_id: STRIPE_CLIENT_ID,
        stripe_user_id: stripe_user_id,
      });
    } catch (stripeError) {
      // Convert stripe-specific error into HttpsError
      console.error(stripeError);
      throw new functions.https.HttpsError("internal", stripeError.message, stripeError);
    }

    const batch = admin.firestore().batch()

    batch.delete(
      admin.firestore().doc(`/admins/${uid}/system/stripe`)
    )
    batch.set(
      admin.firestore().doc(`/admins/${uid}/public/stripe`),
      {
        isConnected: false,
        stripeAccount: null
      }
    )

    await batch.commit()
    return { result: response }
  } catch (error) {
    console.error(error)
    throw error
  }
});
