#!/bin/bash

set -e

if [ "$SOLIDITY_COVERAGE" = true ]; then
  yarn run coveralls
else
  yarn lint
  WT_DEBUG=true yarn test test/LifToken.js test/Crowdsale.js test/MarketValidationMechanism.js test/VestedPayment.js
  WT_DEBUG=true GEN_TESTS_QTY=40 yarn test test/CrowdsaleGenTest.js
fi
