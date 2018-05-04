* [LifCrowdsale](#lifcrowdsale)
  * [foundersWallet](#function-founderswallet)
  * [unpause](#function-unpause)
  * [weiRaised](#function-weiraised)
  * [tokensSold](#function-tokenssold)
  * [MVM](#function-mvm)
  * [paused](#function-paused)
  * [MVM24PeriodsCapUSD](#function-mvm24periodscapusd)
  * [setWeiPerUSDinTGE](#function-setweiperusdintge)
  * [getRate](#function-getrate)
  * [foundationWallet](#function-foundationwallet)
  * [finalize](#function-finalize)
  * [maxFoundationCapUSD](#function-maxfoundationcapusd)
  * [purchases](#function-purchases)
  * [pause](#function-pause)
  * [isFinalized](#function-isfinalized)
  * [owner](#function-owner)
  * [addPrivatePresaleTokens](#function-addprivatepresaletokens)
  * [returnPurchase](#function-returnpurchase)
  * [claimEth](#function-claimeth)
  * [foundersVestedPayment](#function-foundersvestedpayment)
  * [weiPerUSDinTGE](#function-weiperusdintge)
  * [rate1](#function-rate1)
  * [setWeiLockSeconds](#function-setweilockseconds)
  * [minCapUSD](#function-mincapusd)
  * [end1Timestamp](#function-end1timestamp)
  * [startTimestamp](#function-starttimestamp)
  * [buyTokens](#function-buytokens)
  * [transferOwnership](#function-transferownership)
  * [funded](#function-funded)
  * [end2Timestamp](#function-end2timestamp)
  * [rate2](#function-rate2)
  * [foundationVestedPayment](#function-foundationvestedpayment)
  * [token](#function-token)
  * [Finalized](#event-finalized)
  * [TokenPresalePurchase](#event-tokenpresalepurchase)
  * [TokenPurchase](#event-tokenpurchase)
  * [Pause](#event-pause)
  * [Unpause](#event-unpause)
  * [OwnershipTransferred](#event-ownershiptransferred)

# LifCrowdsale


## *function* foundersWallet

LifCrowdsale.foundersWallet() `view` `1bfaf155`





## *function* unpause

LifCrowdsale.unpause() `nonpayable` `3f4ba83a`

> called by the owner to unpause, returns to normal state




## *function* weiRaised

LifCrowdsale.weiRaised() `view` `4042b66f`





## *function* tokensSold

LifCrowdsale.tokensSold() `view` `518ab2a8`





## *function* MVM

LifCrowdsale.MVM() `view` `5a388a43`





## *function* paused

LifCrowdsale.paused() `view` `5c975abb`





## *function* MVM24PeriodsCapUSD

LifCrowdsale.MVM24PeriodsCapUSD() `view` `5d91e27b`





## *function* setWeiPerUSDinTGE

LifCrowdsale.setWeiPerUSDinTGE(_weiPerUSD) `nonpayable` `6274ca4b`

> Set the wei per USD rate for the TGE. Has to be called by the owner up to `setWeiLockSeconds` before `startTimestamp`

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | _weiPerUSD | wei per USD rate valid during the TGE |


## *function* getRate

LifCrowdsale.getRate() `view` `679aefce`

> Returns the current Lif per Eth rate during the TGE



Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | undefined |

## *function* foundationWallet

LifCrowdsale.foundationWallet() `view` `6b7ae8dc`





## *function* finalize

LifCrowdsale.finalize(deployMVM) `nonpayable` `6c9789b0`

> Finalizes the crowdsale, taking care of transfer of funds to the Winding Tree Foundation and creation and funding of the Market Validation Mechanism in case the soft cap was exceeded. It also unpauses the token to enable transfers. It can be called only once, after `end2Timestamp`

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* | deployMVM | undefined |


## *function* maxFoundationCapUSD

LifCrowdsale.maxFoundationCapUSD() `view` `816f3438`





## *function* purchases

LifCrowdsale.purchases() `view` `842a77d3`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* |  | undefined |


## *function* pause

LifCrowdsale.pause() `nonpayable` `8456cb59`

> called by the owner to pause, triggers stopped state




## *function* isFinalized

LifCrowdsale.isFinalized() `view` `8d4e4083`





## *function* owner

LifCrowdsale.owner() `view` `8da5cb5b`





## *function* addPrivatePresaleTokens

LifCrowdsale.addPrivatePresaleTokens(beneficiary, weiSent, rate) `nonpayable` `a5878c65`

> Allows to add the address and the amount of wei sent by a contributor in the private presale. Can only be called by the owner before the beginning of TGE

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | beneficiary | Address to which Lif will be sent |
| *uint256* | weiSent | Amount of wei contributed |
| *uint256* | rate | Lif per ether rate at the moment of the contribution |


## *function* returnPurchase

LifCrowdsale.returnPurchase(contributor) `nonpayable` `ad686011`

> Allows the owner to return an purchase to a contributor

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | contributor | undefined |


## *function* claimEth

LifCrowdsale.claimEth() `nonpayable` `b7cdddcb`

> Allows a TGE contributor to claim their contributed eth in case the TGE has finished without reaching the minCapUSD




## *function* foundersVestedPayment

LifCrowdsale.foundersVestedPayment() `view` `bbb0c054`





## *function* weiPerUSDinTGE

LifCrowdsale.weiPerUSDinTGE() `view` `ca256771`





## *function* rate1

LifCrowdsale.rate1() `view` `cf854969`





## *function* setWeiLockSeconds

LifCrowdsale.setWeiLockSeconds() `view` `d12a6049`





## *function* minCapUSD

LifCrowdsale.minCapUSD() `view` `ded317a8`





## *function* end1Timestamp

LifCrowdsale.end1Timestamp() `view` `e29f610d`





## *function* startTimestamp

LifCrowdsale.startTimestamp() `view` `e6fd48bc`





## *function* buyTokens

LifCrowdsale.buyTokens(beneficiary) `payable` `ec8ac4d8`

> Allows to get tokens during the TGE. Payable. The value is converted to Lif using the current rate obtained by calling `getRate()`.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | beneficiary | Address to which Lif should be sent |


## *function* transferOwnership

LifCrowdsale.transferOwnership(newOwner) `nonpayable` `f2fde38b`

> Allows the current owner to transfer control of the contract to a newOwner.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | newOwner | The address to transfer ownership to. |


## *function* funded

LifCrowdsale.funded() `view` `f3a504f2`

> Modifier



Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |

## *function* end2Timestamp

LifCrowdsale.end2Timestamp() `view` `f4fab748`





## *function* rate2

LifCrowdsale.rate2() `view` `f555b815`





## *function* foundationVestedPayment

LifCrowdsale.foundationVestedPayment() `view` `f5d05f7e`





## *function* token

LifCrowdsale.token() `view` `fc0c546a`






## *event* Finalized

LifCrowdsale.Finalized() `6823b073`



## *event* TokenPresalePurchase

LifCrowdsale.TokenPresalePurchase(beneficiary, weiAmount, rate) `1dfc91d4`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | beneficiary | indexed |
| *uint256* | weiAmount | not indexed |
| *uint256* | rate | not indexed |

## *event* TokenPurchase

LifCrowdsale.TokenPurchase(purchaser, beneficiary, value, amount) `623b3804`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | purchaser | indexed |
| *address* | beneficiary | indexed |
| *uint256* | value | not indexed |
| *uint256* | amount | not indexed |

## *event* Pause

LifCrowdsale.Pause() `6985a022`



## *event* Unpause

LifCrowdsale.Unpause() `7805862f`



## *event* OwnershipTransferred

LifCrowdsale.OwnershipTransferred(previousOwner, newOwner) `8be0079c`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | previousOwner | indexed |
| *address* | newOwner | indexed |


---