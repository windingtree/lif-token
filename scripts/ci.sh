#!/bin/bash

set -e

if [ "$SOLIDITY_COVERAGE" = true ]; then
  yarn run coveralls
else
  yarn lint
  WT_DEBUG=true yarn test \
    test/token/LifToken.js \
    test/token/LifChannels.js \
    test/token/LifTokenTest.js \
    test/distribution/Crowdsale.js \
    test/distribution/MarketValidationMechanism.js \
    test/distribution/VestedPayment.js \
    test/proxy/upgradeability.js
  WT_DEBUG=true GEN_TESTS_TIMEOUT=400 GEN_TESTS_QTY=40 yarn test test/distribution/CrowdsaleGenTest.js
fi
