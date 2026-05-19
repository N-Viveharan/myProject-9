

async function run() {
  const form = new FormData();
  form.append('name', 'Test Product');
  form.append('description', 'Test Description');
  form.append('price', '10');
  form.append('category', 'Burgers');
  form.append('stock', '10');
  form.append('imageUrl', 'https://example.com/image.jpg');

  try {
    const res = await fetch('http://localhost:5001/api/products', {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data:", data);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

run();
