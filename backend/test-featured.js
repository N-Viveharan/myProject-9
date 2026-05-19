

async function testFeatured() {
  try {
    const res = await fetch('http://localhost:5001/api/products?isFeatured=true');
    const data = await res.json();
    console.log("Featured Products Count:", data.products.length);
    if(data.products.length > 0) {
       console.log("First Featured:", data.products[0].name);
    }
  } catch(e) {
    console.log(e);
  }
}
testFeatured();
