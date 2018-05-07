* [LifMarketValidationMechanism](#lifmarketvalidationmechanism)
  * [getBuyPrice](#function-getbuyprice)
  * [totalPausedSeconds](#function-totalpausedseconds)
  * [lifToken](#function-liftoken)
  * [getMaxClaimableWeiAmount](#function-getmaxclaimableweiamount)
  * [initialBuyPrice](#function-initialbuyprice)
  * [unpause](#function-unpause)
  * [secondsPerPeriod](#function-secondsperperiod)
  * [initialWei](#function-initialwei)
  * [totalBurnedTokens](#function-totalburnedtokens)
  * [paused](#function-paused)
  * [changeToken](#function-changetoken)
  * [getAccumulatedDistributionPercentage](#function-getaccumulateddistributionpercentage)
  * [isFinished](#function-isfinished)
  * [pause](#function-pause)
  * [owner](#function-owner)
  * [pausedTimestamp](#function-pausedtimestamp)
  * [totalReimbursedWei](#function-totalreimbursedwei)
  * [totalWeiClaimed](#function-totalweiclaimed)
  * [getCurrentPeriodIndex](#function-getcurrentperiodindex)
  * [fund](#function-fund)
  * [calculateDistributionPeriods](#function-calculatedistributionperiods)
  * [claimWei](#function-claimwei)
  * [originalTotalSupply](#function-originaltotalsupply)
  * [startTimestamp](#function-starttimestamp)
  * [periods](#function-periods)
  * [transferOwnership](#function-transferownership)
  * [funded](#function-funded)
  * [sendTokens](#function-sendtokens)
  * [totalPeriods](#function-totalperiods)
  * [foundationAddr](#function-foundationaddr)
  * [Pause](#event-pause)
  * [Unpause](#event-unpause)
  * [ClaimedWei](#event-claimedwei)
  * [SentTokens](#event-senttokens)
  * [OwnershipTransferred](#event-ownershiptransferred)

# LifMarketValidationMechanism


## *function* getBuyPrice

LifMarketValidationMechanism.getBuyPrice() `view` `018a25e8`

> returns the current buy price at which the MVM offers to buy tokens to burn them



Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | price | the current buy price (in eth/lif, multiplied by PRICE_FACTOR) |

## *function* totalPausedSeconds

LifMarketValidationMechanism.totalPausedSeconds() `view` `35a6c1e0`





## *function* lifToken

LifMarketValidationMechanism.lifToken() `view` `38fab8c5`





## *function* getMaxClaimableWeiAmount

LifMarketValidationMechanism.getMaxClaimableWeiAmount() `view` `3ad6f8ac`

> Returns the maximum amount of wei that the foundation can claim. It's a portion of the ETH that was not claimed by token holders



Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | the maximum wei claimable by the foundation as of now |

## *function* initialBuyPrice

LifMarketValidationMechanism.initialBuyPrice() `view` `3ca6d5a9`





## *function* unpause

LifMarketValidationMechanism.unpause() `nonpayable` `3f4ba83a`

> Unpauses the MVM. See `pause` for more details about pausing




## *function* secondsPerPeriod

LifMarketValidationMechanism.secondsPerPeriod() `view` `407f8001`





## *function* initialWei

LifMarketValidationMechanism.initialWei() `view` `5495794b`





## *function* totalBurnedTokens

LifMarketValidationMechanism.totalBurnedTokens() `view` `555f323a`





## *function* paused

LifMarketValidationMechanism.paused() `view` `5c975abb`





## *function* changeToken

LifMarketValidationMechanism.changeToken(newToken) `nonpayable` `66829b16`

> Change the LifToken address

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | newToken | the new token address |


## *function* getAccumulatedDistributionPercentage

LifMarketValidationMechanism.getAccumulatedDistributionPercentage() `view` `6790f3fe`

> calculates the accumulated distribution percentage as of now, following the exponential distribution curve



Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | percentage | the accumulated distribution percentage, used to calculate things like the maximum amount that can be claimed by the foundation |

## *function* isFinished

LifMarketValidationMechanism.isFinished() `view` `7b352962`

> Returns whether the MVM end-of-life has been reached. When that happens no more tokens can be sent to the MVM and the foundation can claim 100% of the remaining balance in the MVM



Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* | finished | true if the MVM end-of-life has been reached |

## *function* pause

LifMarketValidationMechanism.pause() `nonpayable` `8456cb59`

> Pauses the MVM. No tokens can be sent to the MVM and no eth can be claimed from the MVM while paused. MVM total lifetime is extended by the period it stays paused




## *function* owner

LifMarketValidationMechanism.owner() `view` `8da5cb5b`





## *function* pausedTimestamp

LifMarketValidationMechanism.pausedTimestamp() `view` `911ef508`





## *function* totalReimbursedWei

LifMarketValidationMechanism.totalReimbursedWei() `view` `a156ce7b`





## *function* totalWeiClaimed

LifMarketValidationMechanism.totalWeiClaimed() `view` `b30475b6`





## *function* getCurrentPeriodIndex

LifMarketValidationMechanism.getCurrentPeriodIndex() `view` `b4f5a21a`

> Returns the current period as a number from 0 to totalPeriods



Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | the current period as a number from 0 to totalPeriods |

## *function* fund

LifMarketValidationMechanism.fund() `payable` `b60d4288`

> Receives the initial funding from the Crowdsale. Calculates the initial buy price as initialWei / totalSupply




## *function* calculateDistributionPeriods

LifMarketValidationMechanism.calculateDistributionPeriods() `nonpayable` `c0670d2c`

> calculates the exponential distribution curve. It determines how much wei can be distributed back to the foundation every month. It starts with very low amounts ending with higher chunks at the end of the MVM lifetime




## *function* claimWei

LifMarketValidationMechanism.claimWei(weiAmount) `nonpayable` `ddd7c879`

> Called from the foundation wallet to claim eth back from the MVM. Maximum amount that can be claimed is determined by getMaxClaimableWeiAmount

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | weiAmount | The amount of wei to be claimed |


## *function* originalTotalSupply

LifMarketValidationMechanism.originalTotalSupply() `view` `df8f4eb7`





## *function* startTimestamp

LifMarketValidationMechanism.startTimestamp() `view` `e6fd48bc`





## *function* periods

LifMarketValidationMechanism.periods() `view` `ea4a1104`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | undefined |


## *function* transferOwnership

LifMarketValidationMechanism.transferOwnership(newOwner) `nonpayable` `f2fde38b`

> Allows the current owner to transfer control of the contract to a newOwner.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | newOwner | The address to transfer ownership to. |


## *function* funded

LifMarketValidationMechanism.funded() `view` `f3a504f2`





## *function* sendTokens

LifMarketValidationMechanism.sendTokens(tokens) `nonpayable` `f5c6ca08`

> allows to send tokens to the MVM in exchange of ETH at the price determined by getBuyPrice. The tokens are burned

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | tokens | The amount of tokens to be sent to teh MVM |


## *function* totalPeriods

LifMarketValidationMechanism.totalPeriods() `view` `fea708f6`





## *function* foundationAddr

LifMarketValidationMechanism.foundationAddr() `view` `feafb79b`





## *event* Pause

LifMarketValidationMechanism.Pause() `6985a022`



## *event* Unpause

LifMarketValidationMechanism.Unpause(pausedSeconds) `aaa520fd`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | pausedSeconds | not indexed |

## *event* ClaimedWei

LifMarketValidationMechanism.ClaimedWei(claimedWei) `7995ed8c`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | claimedWei | not indexed |

## *event* SentTokens

LifMarketValidationMechanism.SentTokens(sender, price, tokens, returnedWei) `1e3ea569`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | sender | indexed |
| *uint256* | price | not indexed |
| *uint256* | tokens | not indexed |
| *uint256* | returnedWei | not indexed |

## *event* OwnershipTransferred

LifMarketValidationMechanism.OwnershipTransferred(previousOwner, newOwner) `8be0079c`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | previousOwner | indexed |
| *address* | newOwner | indexed |


---