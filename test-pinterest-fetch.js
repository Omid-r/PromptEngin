async function run() {
  try {
    const response = await fetch("https://i.pinimg.com/736x/8e/31/5d/8e315d0bf0a9a16f22881e19484b90ec.jpg", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    console.log(response.status);
    console.log(await response.arrayBuffer().then(b => b.byteLength));
  } catch (e) {
    console.error(e);
  }
}
run();
