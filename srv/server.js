const express = require("express");
const xsenv = require("@sap/xsenv");
const passport = require("passport");
const xssec = require("@sap/xssec");
const hdbext = require("@sap/hdbext");
const keyUserRouter = require(__dirname + "/lib/routers/key-user");

const app = express(),
    port = process.env.PORT || 3000;

xsenv.loadEnv();

passport.use("JWT", new xssec.JWTStrategy(xsenv.getServices({
    uaa: {
        tag: "xsuaa"
    }
}).uaa));

app.use(passport.initialize());

let hanaOptions = xsenv.getServices({
    hana: {
        plan: "hdi-shared"
    }
});

app.use(
    hdbext.middleware(hanaOptions.hana),
    passport.authenticate("JWT", {
        session: false
    })
);

//JSON parsing middleware
app.use(express.json());

//Key User router
app.use("/keyuser/flex", keyUserRouter);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});