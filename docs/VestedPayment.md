* [VestedPayment](#vestedpayment)
  * [secondsPerPeriod](#function-secondsperperiod)
  * [claimTokens](#function-claimtokens)
  * [changeToken](#function-changetoken)
  * [owner](#function-owner)
  * [tokens](#function-tokens)
  * [cliffDuration](#function-cliffduration)
  * [getAvailableTokens](#function-getavailabletokens)
  * [startTimestamp](#function-starttimestamp)
  * [claimed](#function-claimed)
  * [transferOwnership](#function-transferownership)
  * [token](#function-token)
  * [totalPeriods](#function-totalperiods)
  * [OwnershipTransferred](#event-ownershiptransferred)

# VestedPayment


## *function* secondsPerPeriod

VestedPayment.secondsPerPeriod() `view` `407f8001`





## *function* claimTokens

VestedPayment.claimTokens(amount) `nonpayable` `46e04a2f`

> Claim the tokens, they can be claimed only by the owner of the contract

Inputs

| | | |
|-|-|-|
| *uint256* | amount | how many tokens to be claimed |


## *function* changeToken

VestedPayment.changeToken(newToken) `nonpayable` `66829b16`

> Change the LifToken address

Inputs

| | | |
|-|-|-|
| *address* | newToken | undefined |


## *function* owner

VestedPayment.owner() `view` `8da5cb5b`





## *function* tokens

VestedPayment.tokens() `view` `9d63848a`





## *function* cliffDuration

VestedPayment.cliffDuration() `view` `d85349f7`





## *function* getAvailableTokens

VestedPayment.getAvailableTokens() `view` `e35568cb`

> Get how many tokens are available to be claimed




## *function* startTimestamp

VestedPayment.startTimestamp() `view` `e6fd48bc`





## *function* claimed

VestedPayment.claimed() `view` `e834a834`





## *function* transferOwnership

VestedPayment.transferOwnership(newOwner) `nonpayable` `f2fde38b`

> Allows the current owner to transfer control of the contract to a newOwner.

Inputs

| | | |
|-|-|-|
| *address* | newOwner | The address to transfer ownership to. |


## *function* token

VestedPayment.token() `view` `fc0c546a`





## *function* totalPeriods

VestedPayment.totalPeriods() `view` `fea708f6`





## *event* OwnershipTransferred

VestedPayment.OwnershipTransferred(previousOwner, newOwner) `8be0079c`

Arguments

| | | |
|-|-|-|
| *address* | previousOwner | indexed |
| *address* | newOwner | indexed |


---