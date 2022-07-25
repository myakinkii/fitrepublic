"use strict";

const cds = require("@sap/cds");
const proxy = require("@sap/cds-odata-v2-adapter-proxy");

cds.on("bootstrap", app => app.use(proxy({ returnPrimitivePlain:false, returnPrimitiveNested:false })));

module.exports = cds.server;