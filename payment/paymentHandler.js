const PayTabs = require('paytabs_pt2');

let
    profileID = "112942",
    serverKey = "S6JNJKLH9W-JJTWRHKKLD-W2NNT6DKZJ",
    region = "SAU";

PayTabs.setConfig( profileID, serverKey, region);

let paymentMethods = ["creditcard, valu, applepay"];

let transaction = {
    type:"sale",
    class:"ecom"
};

let transaction_details = [
    transaction.type,
    transaction.class
];

let cart = {
    id: "100001",
    currency: "USD",
    amount: "50",
    description: "dummy description"
};

let cart_details = [
    cart.id,
    cart.currency,
    cart.amount,
    cart.description
];

let customer = {
    name:"yahia walid",
    email:"yahiawalid95@gmail.com",
    phone:"+201065600747",
    street1:"dummy street, dummy building, dummy apt",
    city:"maadi",
    state:"CAI",
    country:"EG",
    zip:"52121",
    IP:"10.0.0.1"
}

let customer_details = [
    customer.name,
    customer.email,
    customer.phone,
    customer.street,
    customer.city,
    customer.state,
    customer.country,
    customer.zip,
    customer.IP
];

let shipping_address = customer_details;
let url = {
    callback:"https://elrayesdev.com/api/callback",
    response:"https://elrayesdev.com/response/order/"+cart.id
}

let response_URLs = [
    url.response,
    url.callback
];

let lang = "ar";

paymentPageCreated = function ($results) {
    console.log($results);
}

let frameMode = false;

PayTabs.createPaymentPage(
    paymentMethods,
    transaction_details,
    cart_details,
    customer_details,
    shipping_address,
    response_URLs,
    lang,
    paymentPageCreated,
    frameMode
);