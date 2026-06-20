/**
 * Proof of Origin (PO) Token Generator
 * Diadaptasi dari logika WebViewPoTokenProvider di AuraMusic (MusicCuba).
 * 
 * Fungsi ini menjalankan runtime BotGuard dari Google (jnn-pa.googleapis.com)
 * untuk menghasilkan token integritas. Token ini digunakan untuk membuktikan
 * kepada YouTube bahwa request ini berasal dari "klien asli" sehingga
 * pemutaran audio/mp3 tidak diblokir.
 */

export async function generatePoToken(videoId: string): Promise<string | null> {
  try {
    const API_KEY = "AIza" + "SyDyT5W" + "0Jh49F30Pqqtyfdf7pDLFKLJoAnw";
    const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";
    const CREATE_URL = "https://jnn-pa.googleapis.com/$rpc/google.internal.waa.v1.Waa/Create";
    const GENERATE_URL = "https://jnn-pa.googleapis.com/$rpc/google.internal.waa.v1.Waa/GenerateIT";

    const headers = {
      "Content-Type": "application/json+protobuf",
      "x-goog-api-key": API_KEY,
      "x-user-agent": "grpc-web-javascript/0.1"
    };

    // Binding bisa berupa videoId atau visitorData (jika streaming)
    const binding = videoId;

    // Step 1: fetch BotGuard challenge
    const createRes = await fetch(CREATE_URL, {
      method: "POST",
      headers: headers,
      body: JSON.stringify([REQUEST_KEY])
    });

    if (!createRes.ok) {
      console.warn("Create HTTP status: " + createRes.status);
      return null;
    }

    const createJson = await createRes.json();
    const program = createJson[0];
    const globalName = createJson[1];

    if (!program || !globalName) {
      console.warn("Invalid Create payload");
      return null;
    }

    // Step 2: install the VM
    // Karena ini berjalan di React (Browser), BotGuard VM dapat berjalan dengan normal
    // tanpa perlu emulator WebView seperti di Android.
    try {
      // eslint-disable-next-line no-new-func
      new Function(program)();
    } catch (e) {
      console.warn("Program eval failed: ", e);
      return null;
    }

    // @ts-ignore
    const vm = window[globalName];
    if (!vm || typeof vm.a !== "function") {
      console.warn("VM not installed");
      return null;
    }

    // Step 3: snapshot the runtime
    const snapshot: any = await new Promise((resolve, reject) => {
      try {
        vm.a(binding, (fnAsync: any) => {
          try { resolve(fnAsync); } catch (e) { reject(e); }
        }, true, undefined, () => {});
      } catch (e) { reject(e); }
    });

    const fnAsync = (typeof snapshot === "function") ? snapshot : (snapshot && snapshot.fn);
    if (typeof fnAsync !== "function") {
      console.warn("No async fn");
      return null;
    }

    const integrityRes: any = await new Promise((resolve) => {
      try {
        fnAsync((value: any, error: any) => resolve(error ? null : value));
      } catch (e) { resolve(null); }
    });

    const integrityToken = integrityRes && integrityRes.integrityToken;
    if (!integrityToken) {
      console.warn("No integrity token");
      return null;
    }

    // Step 4: mint the PO token
    const genRes = await fetch(GENERATE_URL, {
      method: "POST",
      headers: headers,
      body: JSON.stringify([integrityToken, binding])
    });

    if (!genRes.ok) {
      console.warn("Generate HTTP status: " + genRes.status);
      return null;
    }

    const genJson = await genRes.json();
    const poToken = genJson && genJson[0];

    if (!poToken) {
      console.warn("No PO token in response");
      return null;
    }

    console.log("Berhasil membuat PO Token dengan panjang:", poToken.length);
    return poToken;

  } catch (err) {
    console.error("Fatal error generating PO Token:", err);
    return null;
  }
}
