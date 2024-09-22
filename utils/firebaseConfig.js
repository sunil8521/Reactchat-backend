import dotenv from "dotenv";
import admin from "firebase-admin";
dotenv.config();
import { v4 as uuid } from "uuid";
import { ErrorHandling } from "../error/error.js";

admin.initializeApp({
  credential: admin.credential.cert({
    type: "service_account",
    project_id: "chatapp-a03c2",
    private_key_id: process.env.F_PRIVATE_KEY_ID,
    private_key:
      "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCX0aRH2W4sunYQ\n4CS6W5JU648Y5c6S2W3jCp2RzZbz/gtQv1zXCzBZbnNgEboUrYnXUroR3Vb1V9gy\nnuU2c5HXIXBUl8K2VKHaF33UiUtlJZasovUrF0gNqMTZxvtfFbbkforQBfbsIFFq\nFBodbP0uDlIl1ajPHucV4fccpB6oqIZgAaUP0z67zxfbooUvlHexyb2lHJUuWKjp\nVxm2hAKxsj9PdfI97Bc3IOksyXoU+FwZZEIk2p/iBfUrkwQ/bZA//yXOjD55Fvi/\noERBL6Q47QTkjO5M8qtEC2o2dfdyQIb/of8S2XWIK9IjnGrKAGcHQPTlVYlP8n0Z\n50UVB3YHAgMBAAECggEAARABNlTZ5eDoMqC0S8RC9z/Zdd3QiaE77lAvX3Xbje7u\nkAIcLuUafDBps6JsIE5BSLXWLN8qXKKLa3nxNhBY/53G9iXvFuzrX7tfsL0alKVO\ns1FF+1Hjud9p1pxYkLHLiziCKt01J9ySCqFZYsYAf5yvYSm9pLVyqJSMRjG1L+Ol\n9GZPhur8/5gof78/KQEWt1zWo7+BzsCbVBtIYe+OubtDu8YuU/wvwLZM9HPfQyZq\nzacdQABdE3op8n4QpRpo8iHeAGwqt4eT5ekCEC7zC1B7J3kFktxNVoaiSmfUpSWC\nKMzw6WpGsOui/geDEqk1yPUtD+byXBz7dTvSwZbdAQKBgQDPl9fVuMPEHF4sPeys\nnMMlXCYcHaQV9ueIVrfhq9XeFnw9cYimZmSKcZgJ9UNQTjBPMbvd681eaV30CDeG\nw5Tc2STgv15gzGa7UU4Q0bos5FdnW6gp/1FHeCl03A0Ebc53PnbSJOUoZ3K7ws2S\nCwVotBT1ZNvQQh4DVuQ20unJuwKBgQC7OGMnNmaYb+ltKEVW8e8+u9dZwo01xPpi\naDv4GxX1v088cy8ZhEP5qleRxfI6scBDMQGP4RTXJD5HeDAQjX2Cuh6o/ZjDzCbi\njdC6NlXlsd9mfaHzQK0vnQO8Nv5Q+809WXwUi25J2vVqSRWsXtKO+bSLjR8odmIc\nPvKwclQKJQKBgDkRJOQ7xpVCtyCyZT2OWpcKne9ctp7TIRL5w9LlygUjaUP60fXs\nb/cfAwy5v6dz1xPuOBbpm6s4i/tpxtnlKicMCnc+JFO33QXhc/RrsyJkIyLmr3Pc\nHBvpjHvzgiCVjwx4v3FFczmINqInCxv6q6H830YWU9cMVfPVDyeDE4HBAoGAHtC6\nKUMgAekxr6DYQOZTbaz3VjPakEYavEXR0RWMOMXDYfzHfNizY42xGjJNm3GUZrrT\nOf5fMsYpZhQXPTI8vV6rGz+afGfG4rVa7LtyyfrL/Y+iL2qu1s5uRfV7SJMZhgaL\nkMoeXhOnH1ZmNdfpqlTZbbrNrRhHL8UApyA6Su0CgYB7aTBS8s6wLei8xq+FLHP9\ntD3ehdciC1xUxXrnJDGicDU0+bwlso8iYS6dJeg01xJlMD+IGIgccRy5c54OiEuS\nenosZHxPucrotd6drSsMAK/8jLBc06DF6ZVa1ss+OUfh2KCZxxOhGddm12mgEW4l\nYcEdxB1yZDxGB3zYuGgf7w==\n-----END PRIVATE KEY-----\n",
    client_email: process.env.F_CLIENT_EMAIL,

    client_id: process.env.F_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url:
      "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-a8zmc%40chatapp-a03c2.iam.gserviceaccount.com",
    universe_domain: "googleapis.com",
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const bucket = admin.storage().bucket();

export const uploadToFirebase = async (files = []) => {
  const uploadPromises = files.map((file) => {
    // const fileName = `${uuid()}_${file.originalname}`;
    const fileName = `${uuid()}.${file.originalname.split('.').pop()}`; // Include the file extension
    const fileUpload = bucket.file(fileName);

    return new Promise((resolve, reject) => {
      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      stream.on("error", (error) => {
        reject(new ErrorHandling(error.message, 500));
      });

      stream.on("finish", async () => {
        // Make the file public or generate a signed URL (optional)
        await fileUpload.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        resolve({ public_id: fileName, url: publicUrl });
      });

      stream.end(file.buffer);
    });
  });

  try {
    const result = await Promise.all(uploadPromises);
    return result;
  } catch (error) {
    throw new ErrorHandling(error.message, 500);
  }
};

export const deleteFromFirebase = async (public_ids = []) => {
  const deletePromises = public_ids.map((id) => {
    return new Promise((resolve, reject) => {
      const file = bucket.file(id);

      file.delete((error) => {
        if (error) {
          reject(
            new ErrorHandling(`Failed to delete file with ID: ${id}`, 500)
          );
        } else {
          resolve({ success: true, id });
        }
      });
    });
  });

  try {
    const result = await Promise.all(deletePromises);
    return result;
  } catch (error) {
    throw new ErrorHandling(error.message, 500);
  }
};
