#!/bin/bash

set -e

if [ "$SOLIDITY_COVERAGE" = true ]; then
  npm run coveralls
else
  npm run lint
  WT_DEBUG=true npm test test/LifToken.js test/Crowdsale.js test/MarketValidationMechanism.js test/VestedPayment.js
  WT_DEBUG=true GEN_TESTS_TIMEOUT=400 GEN_TESTS_QTY=40 npm test test/CrowdsaleGenTest.js
fi
