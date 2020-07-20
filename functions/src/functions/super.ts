import * as functions from 'firebase-functions'
import * as utils from '../lib/utils'
import * as admin from 'firebase-admin';

export const dispatch = async (db: FirebaseFirestore.Firestore, data: any, context: functions.https.CallableContext) => {
  if (!context.auth?.token?.admin) {
    throw new functions.https.HttpsError('permission-denied', 'You do not have permission to confirm this request.')
  }
  const { cmd, uid, key, value } = data;
  utils.validate_params({ cmd, uid });

  let result: object = { result: false, message: "not processed" };
  try {
    switch (cmd) {
      case "getCustomeClaims":
        result = await getCustomClaims(db, uid);
        break;
      case "setCustomeClaim":
        const userRecord = await admin.auth().getUser(uid);
        if (key === "operator" && userRecord.email) {
          result = await setCustomClaim(db, uid, key, value);
        }
        break;
      default:
        throw new functions.https.HttpsError('invalid-argument', 'Invalid command.')
    }

    return result
  } catch (error) {
    throw utils.process_error(error)
  }
}

const getCustomClaims = async (db: FirebaseFirestore.Firestore, uid: string) => {
  const userRecord = await admin.auth().getUser(uid);
  const customClaims = userRecord.customClaims || {};
  return { result: customClaims }
}

const setCustomClaim = async (db: FirebaseFirestore.Firestore, uid: string, key: string, value: boolean) => {
  const obj = { [key]: value };
  await admin.auth().setCustomUserClaims(uid, obj);
  await db.doc(`admins/${uid}`).update(obj); // duplicated data in DB
  return await getCustomClaims(db, uid);
}
