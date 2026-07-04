import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: "rzp_test_SonRUhUvdcVa2E",
  key_secret: "v7kAd0m6Vsaa1o7jDIMm8GcG",
});

async function test() {
  try {
    const order = await razorpay.orders.create({
      amount: 1000,
      currency: "INR",
      receipt: "test_receipt",
    });
    console.log("Success:", order);
  } catch (err) {
    console.error("Razorpay Error:", err);
    console.log("Name:", err.name);
    console.log("Constructor:", err.constructor?.name);
    console.log("Status:", err.statusCode);
  }
}

test();
