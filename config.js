const { str, cleanEnv } = require('envalid')
const fs = require('fs')
const dotEnv = require('dotenv')

const envConfig = dotEnv.parse(fs.readFileSync('.env'))

const config = cleanEnv(envConfig, {
    MONGODB_ATLAS_CLUSTER_URI: str(),
}, { strict: true })

module.exports = config
