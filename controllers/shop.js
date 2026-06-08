const Product = require("../models/product");
const Order = require("../models/order");
const cookieParse = require("../util/cookieparser");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const ZarinpalCheckout = require("zarinpal-checkout");
const { parse } = require("path");

const ITEMS_PER_PAGE = 6;

var zarinpal = ZarinpalCheckout.create(
  process.env.ZARINPAL_MERCHANT_ID || "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  true
);

exports.getProducts = (req, res) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find()
    .count()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render("shop/product-list", {
        path: "/products",
        pageTitle: "Shop",
        prods: products,
        isAuthenticated: req.session.isLoggedIn,
        csrfToken: req.csrfToken(),
        currentPage: page,
        totalProducts: totalItems,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      console.log(err);
    });
};
exports.getIndex = (req, res) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find()
    .count()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render("shop/index", {
        path: "/",
        pageTitle: "Shop",
        prods: products,
        isAuthenticated: req.session.isLoggedIn,
        csrfToken: req.csrfToken(),
        currentPage: page,
        totalProducts: totalItems,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      console.log(err);
    });
};
exports.getProduct = (req, res) => {
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-details", {
        product: product,
        pageTitle: product.title,
        path: "/products",
        isAuthenticated: req.session.isLoggedIn,
      });
    })
    .catch((err) => {
      console.log(err);
    });
};
exports.postCart = (req, res) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addTocart(product);
    })
    .then(() => {
      res.redirect("/cart");
    })
    .catch((err) => {
      console.log(err);
      res.status(500).render("500", {
        pageTitle: "خطا",
        path: "/500",
        isAuthenticated: req.session.isLoggedIn,
      });
    });
};
exports.getCart = async (req, res) => {
  const user = await req.user.populate("cart.items.productId");
  res.render("shop/cart", {
    pageTitle: "Cart",
    path: "/cart",
    products: user.cart.items,
    isAuthenticated: req.session.isLoggedIn,
  });
};
exports.postCartDeleteProduct = (req, res) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then((result) => {
      console.log(result);
      res.redirect("/cart");
    })
    .catch((err) => {
      console.log(err);
    });
};
exports.postOrder = (req, res) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return {
          quantity: i.quantity,
          product: {
            ...i.productId._doc,
          },
        };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then(() => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      console.log(err);
    });
};
exports.getOrder = (req, res) => {



  Order.find({
    "user.userId": req.user._id,
  })
    .then((orders) => {
      res.render("shop/orders", {
        pageTitle: "Orders",
        path: "/orders",
        orders: orders,
        isAuthenticated: req.session.isLoggedIn,
        refId: req.flash('refId')[0] 
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getCheckout = async (req, res) => {
  const user = await req.user.populate("cart.items.productId");
  const products = user.cart.items;
  let totalPrice = 0;
  products.forEach((p) => {
    totalPrice += p.quantity * p.productId.price;
  });

  res.render("shop/checkout", {
    pageTitle: "Checkout",
    path: "/checkout",
    products: user.cart.items,
    isAuthenticated: req.session.isLoggedIn,
    totalSum: totalPrice,
  });
};

exports.getPayment = async (req, res) => {
  try {
    const user = await req.user.populate("cart.items.productId");
    const products = user.cart.items;
    
    if (products.length === 0) {
      req.flash('error', 'سبد خرید خالی است');
      return res.redirect("/cart");
    }
    
    let totalPrice = 0;
    products.forEach((p) => {
      totalPrice += p.quantity * p.productId.price;
    });

    zarinpal
      .PaymentRequest({
        Amount: totalPrice,
        CallbackURL: "http://localhost:3001/checkPayment",
        Description: "تست اتصال به درگاه پرداخت",
        Email: user.email,
        Mobile: "0912000000",
      })
      .then((response) => {
        if (response && response.url) {
          console.log(response);
          res.redirect(response.url);
        } else {
          console.log("Invalid response from zarinpal", response);
          req.flash('error', 'خطا در ارتباط با درگاه پرداخت');
          res.redirect("/checkout");
        }
      })
      .catch((err) => {
        console.log("Payment Request Error:", err);
        req.flash('error', 'خطا در درخواست پرداخت: ' + err.message);
        res.redirect("/checkout");
      });
  } catch (err) {
    console.log("getPayment Error:", err);
    req.flash('error', 'خطا در پردازش درخواست: ' + err.message);
    res.status(500).render("500", {
      pageTitle: "خطا",
      path: "/500",
      isAuthenticated: req.session.isLoggedIn,
    });
  }
};

exports.checkPayment = async (req, res) => {
  try {
    const user = await req.user.populate("cart.items.productId");
    const products = user.cart.items;
    let totalPrice = 0;
    products.forEach((p) => {
      totalPrice += p.quantity * p.productId.price;
    });

    const authority = req.query.Authority;
    const status = req.query.Status;

    if (!authority || !status) {
      req.flash('error', 'پارامترهای پرداخت نامعتبر');
      return res.redirect("/cart");
    }

    if (status == "OK") {
      zarinpal
        .PaymentVerification({
          Amount: totalPrice,
          Authority: authority,
        })
        .then((response) => {
          if (response && response.status == 100) {
            console.log("Verified :" + response.RefID);

            req.user
              .populate("cart.items.productId")
              .then((user) => {
                const products = user.cart.items.map((i) => {
                  return {
                    quantity: i.quantity,
                    product: {
                      ...i.productId._doc,
                    },
                  };
                });
                const order = new Order({
                  user: {
                    email: req.user.email,
                    userId: req.user,
                  },
                  products: products,
                });
                return order.save();
              })
              .then(() => {
                return req.user.clearCart();
              })
              .then(() => {
                req.flash('refId', `${response.RefID}`);
                res.redirect(`/orders`);
              })
              .catch((err) => {
                console.log("Order creation error:", err);
                req.flash('error', 'خطا در ثبت سفارش');
                res.redirect("/orders");
              });
          } else {
            console.log("Payment verification failed", response);
            req.flash('error', 'تأیید پرداخت ناموفق');
            res.redirect("/cart");
          }
        })
        .catch((err) => {
          console.log("Payment Verification Error:", err);
          req.flash('error', 'خطا در تأیید پرداخت: ' + err.message);
          res.redirect("/cart");
        });
    } else if (status == "NOK") {
      req.flash('error', 'پرداخت توسط کاربر لغو شد');
      res.redirect("/cart");
    } else {
      req.flash('error', 'وضعیت پرداخت نامعلوم');
      res.redirect("/cart");
    }
  } catch (err) {
    console.log("checkPayment Error:", err);
    req.flash('error', 'خطا در پردازش تأیید: ' + err.message);
    res.status(500).render("500", {
      pageTitle: "خطا",
      path: "/500",
      isAuthenticated: req.session.isLoggedIn,
    });
  }
};

exports.getInvoices = (req, res, next) => {
  const orderId = req.params.orderId;

  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error("No Order Found"));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("unauthorized"));
      }

      const invoiceName = "invoices-" + orderId + ".pdf";
      const invoicePath = path.join("files", "invoices", invoiceName);

      const pdfDoc = new PDFDocument();

      res.setHeader("Content-Type", "application/pdf; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="' + invoiceName + '"'
      );

      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text("Invoices", {
        underline: true,
      });

      pdfDoc.fontSize(14).text("------------------------------");

      let totalPrice = 0;
      order.products.forEach((prod) => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc.text(prod.quantity + " x " + prod.product.price + " Rial ");
      });

      pdfDoc.text("Total Price :" + totalPrice);

      pdfDoc.end();

      // fs.readFile(invoicePath, (err, data) => {

      //     if (err) {
      //         return next(err);
      //     }

      //     res.setHeader('Content-Type', 'application/pdf');

      //     res.setHeader('Content-Disposition', 'attachment; filename="' + invoiceName + '"');

      //     res.send(data);

      // })

      // const file = fs.createReadStream(invoicePath);

      // file.pipe(res);
    })
    .catch((err) => next(err));
};
