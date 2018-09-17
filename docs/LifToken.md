* [LifToken](#liftoken)
  * [mintingFinished](#function-mintingfinished)
  * [approve](#function-approve)
  * [totalSupply](#function-totalsupply)
  * [transferFrom](#function-transferfrom)
  * [DECIMALS](#function-decimals)
  * [unpause](#function-unpause)
  * [mint](#function-mint)
  * [burn](#function-burn)
  * [paused](#function-paused)
  * [decreaseApproval](#function-decreaseapproval)
  * [balanceOf](#function-balanceof)
  * [finishMinting](#function-finishminting)
  * [pause](#function-pause)
  * [owner](#function-owner)
  * [burn](#function-burn)
  * [NAME](#function-name)
  * [transfer](#function-transfer)
  * [increaseApproval](#function-increaseapproval)
  * [allowance](#function-allowance)
  * [transferOwnership](#function-transferownership)
  * [SYMBOL](#function-symbol)
  * [Pause](#event-pause)
  * [Unpause](#event-unpause)
  * [Mint](#event-mint)
  * [MintFinished](#event-mintfinished)
  * [OwnershipTransferred](#event-ownershiptransferred)
  * [Approval](#event-approval)
  * [Transfer](#event-transfer)

# LifToken


## *function* mintingFinished

LifToken.mintingFinished() `view` `05d2035b`





## *function* approve

LifToken.approve(_spender, _value) `nonpayable` `095ea7b3`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _spender | undefined |
| *uint256* | _value | undefined |


## *function* totalSupply

LifToken.totalSupply() `view` `18160ddd`

> total number of tokens in existence




## *function* transferFrom

LifToken.transferFrom(_from, _to, _value) `nonpayable` `23b872dd`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _from | undefined |
| *address* | _to | undefined |
| *uint256* | _value | undefined |


## *function* DECIMALS

LifToken.DECIMALS() `view` `2e0f2625`





## *function* unpause

LifToken.unpause() `nonpayable` `3f4ba83a`

> called by the owner to unpause, returns to normal state




## *function* mint

LifToken.mint(_to, _amount) `nonpayable` `40c10f19`

> Function to mint tokens

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _to | The address that will receive the minted tokens. |
| *uint256* | _amount | The amount of tokens to mint. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |

## *function* burn

LifToken.burn(_value) `nonpayable` `42966c68`

> Burns a specific amount of tokens.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | _value | The amount of tokens to be burned. |


## *function* paused

LifToken.paused() `view` `5c975abb`





## *function* decreaseApproval

LifToken.decreaseApproval(_spender, _subtractedValue) `nonpayable` `66188463`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _spender | undefined |
| *uint256* | _subtractedValue | undefined |


## *function* balanceOf

LifToken.balanceOf(_owner) `view` `70a08231`

> Gets the balance of the specified address.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _owner | The address to query the the balance of. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | undefined |

## *function* finishMinting

LifToken.finishMinting() `nonpayable` `7d64bcb4`

> Function to stop minting new tokens.



Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |

## *function* pause

LifToken.pause() `nonpayable` `8456cb59`

> called by the owner to pause, triggers stopped state




## *function* owner

LifToken.owner() `view` `8da5cb5b`





## *function* burn

LifToken.burn(burner, _value) `nonpayable` `9dc29fac`

> Burns a specific amount of tokens of an address This function can be called only by the owner in the minting process

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | burner | undefined |
| *uint256* | _value | The amount of tokens to be burned. |


## *function* NAME

LifToken.NAME() `view` `a3f4df7e`





## *function* transfer

LifToken.transfer(_to, _value) `nonpayable` `a9059cbb`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _to | undefined |
| *uint256* | _value | undefined |


## *function* increaseApproval

LifToken.increaseApproval(_spender, _addedValue) `nonpayable` `d73dd623`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _spender | undefined |
| *uint256* | _addedValue | undefined |


## *function* allowance

LifToken.allowance(_owner, _spender) `view` `dd62ed3e`

> Function to check the amount of tokens that an owner allowed to a spender.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _owner | address The address which owns the funds. |
| *address* | _spender | address The address which will spend the funds. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | undefined |

## *function* transferOwnership

LifToken.transferOwnership(newOwner) `nonpayable` `f2fde38b`

> Allows the current owner to transfer control of the contract to a newOwner.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | newOwner | The address to transfer ownership to. |


## *function* SYMBOL

LifToken.SYMBOL() `view` `f76f8d78`




## *event* Pause

LifToken.Pause() `6985a022`



## *event* Unpause

LifToken.Unpause() `7805862f`



## *event* Mint

LifToken.Mint(to, amount) `0f6798a5`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | to | indexed |
| *uint256* | amount | not indexed |

## *event* MintFinished

LifToken.MintFinished() `ae5184fb`



## *event* OwnershipTransferred

LifToken.OwnershipTransferred(previousOwner, newOwner) `8be0079c`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | previousOwner | indexed |
| *address* | newOwner | indexed |

## *event* Approval

LifToken.Approval(owner, spender, value) `8c5be1e5`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | owner | indexed |
| *address* | spender | indexed |
| *uint256* | value | not indexed |

## *event* Transfer

LifToken.Transfer(from, to, value) `ddf252ad`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | from | indexed |
| *address* | to | indexed |
| *uint256* | value | not indexed |


---