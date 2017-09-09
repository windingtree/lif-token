module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 8
    },
    "globals": {
      "afterEach": true,
      "artifacts": true,
      "assert": true,
      "beforeEach": true,
      "contract": true,
      "it": true,
      "web3": true
    },
    "rules": {
        "no-console": "off",
        "indent": [
            "error",
            2
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ]
    }
};
