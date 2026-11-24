# Solstone native Android push (staging)
- Keep com.solstone.baustelle and the existing signing key. The signed workflow increments versionCode.
- Firebase Console: register Android app with that exact package. Enable Cloud Messaging HTTP v1.
- Store google-services.json as base64 in GitHub Actions secret SOLSTONE_ANDROID_FCM_CONFIG_BASE64. Do not put it in source.
- Create a dedicated least-privileged FCM sender service account, grant Firebase Cloud Messaging API Admin on the target project. Store its JSON as base64 in server-only Vercel environment variable SOLSTONE_FCM_SERVICE_ACCOUNT_BASE64. Never put the private key in GitHub source or NEXT_PUBLIC_ variables.
- Apply staging/solstone-native-push-schema.sql only after reviewing and testing it in an isolated database. Verify anon/authenticated cannot read/write the table and service_role can.
- Deploy the reviewed server and client code to the HTTPS origin used by the APK only after testing against staging. A signed APK alone cannot make push work.
- On a test Android phone open Team Chat > enable push and allow OS notifications. Test foreground tone, background notification, locked screen, tap to open app, incoming call alert, logout, account switch, disabled OS permissions, inactive employee, and unauthorized site recipients. Use two real signed-in test accounts. Force-stopped apps are not expected to receive until reopened. A call notification is not a full-screen ringing/answer UI. No schedules/general-info background triggers yet.
- If Firebase config is missing, the APK build metadata explicitly says nativePushConfigured=false. Do not distribute it as a working background-push release.
