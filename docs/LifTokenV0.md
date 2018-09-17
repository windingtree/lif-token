* [LifTokenV0](#liftokenv0)
  * [mintingFinished](#function-mintingfinished)
  * [approve](#function-approve)
  * [totalSupply](#function-totalsupply)
  * [transferFrom](#function-transferfrom)
  * [DECIMALS](#function-decimals)
  * [unpause](#function-unpause)
  * [transferAndCall](#function-transferandcall)
  * [mint](#function-mint)
  * [burn](#function-burn)
  * [paused](#function-paused)
  * [decreaseApproval](#function-decreaseapproval)
  * [balanceOf](#function-balanceof)
  * [finishMinting](#function-finishminting)
  * [pause](#function-pause)
  * [owner](#function-owner)
  * [increaseApprovalAndCall](#function-increaseapprovalandcall)
  * [burn](#function-burn)
  * [NAME](#function-name)
  * [transfer](#function-transfer)
  * [transferFromAndCall](#function-transferfromandcall)
  * [approveAndCall](#function-approveandcall)
  * [decreaseApprovalAndCall](#function-decreaseapprovalandcall)
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

# LifTokenV0


## *function* mintingFinished

LifTokenV0.mintingFinished() `view` `05d2035b`





## *function* approve

LifTokenV0.approve(_spender, _value) `nonpayable` `095ea7b3`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _spender | undefined |
| *uint256* | _value | undefined |


## *function* totalSupply

LifTokenV0.totalSupply() `view` `18160ddd`

> total number of tokens in existence




## *function* transferFrom

LifTokenV0.transferFrom(_from, _to, _value) `nonpayable` `23b872dd`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _from | undefined |
| *address* | _to | undefined |
| *uint256* | _value | undefined |


## *function* DECIMALS

LifTokenV0.DECIMALS() `view` `2e0f2625`





## *function* unpause

LifTokenV0.unpause() `nonpayable` `3f4ba83a`

> called by the owner to unpause, returns to normal state




## *function* transferAndCall

LifTokenV0.transferAndCall(_to, _value, _data) `payable` `4000aea0`

> Addition to ERC20 token methods. Transfer tokens to a specifiedaddress and execute a call with the sent data on the same transaction

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _to | address The address which you want to transfer to |
| *uint256* | _value | uint256 the amout of tokens to be transfered |
| *bytes* | _data | ABI-encoded contract call to call `_to` address. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |

## *function* mint

LifTokenV0.mint(_to, _amount) `nonpayable` `40c10f19`

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

LifTokenV0.burn(_value) `nonpayable` `42966c68`

> Burns a specific amount of tokens.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | _value | The amount of tokens to be burned. |


## *function* paused

LifTokenV0.paused() `view` `5c975abb`





## *function* decreaseApproval

LifTokenV0.decreaseApproval(_spender, _subtractedValue) `nonpayable` `66188463`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _spender | undefined |
| *uint256* | _subtractedValue | undefined |


## *function* balanceOf

LifTokenV0.balanceOf(_owner) `view` `70a08231`

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

LifTokenV0.finishMinting() `nonpayable` `7d64bcb4`

> Function to stop minting new tokens.



Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |

## *function* pause

LifTokenV0.pause() `nonpayable` `8456cb59`

> called by the owner to pause, triggers stopped state




## *function* owner

LifTokenV0.owner() `view` `8da5cb5b`





## *function* increaseApprovalAndCall

LifTokenV0.increaseApprovalAndCall(_spender, _addedValue, _data) `payable` `90db623f`

> Addition to StandardToken methods. Increase the amount of tokens thatan owner allowed to a spender and execute a call with the sent data.approve should be called when allowed[_spender] == 0. To incrementallowed value is better to use this function to avoid 2 calls (and wait untilthe first transaction is mined)From MonolithDAO Token.sol

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _spender | The address which will spend the funds. |
| *uint256* | _addedValue | The amount of tokens to increase the allowance by. |
| *bytes* | _data | ABI-encoded contract call to call `_spender` address. |


## *function* burn

LifTokenV0.burn(burner, _value) `nonpayable` `9dc29fac`

> Burns a specific amount of tokens of an address This function can be called only by the owner in the minting process

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | burner | undefined |
| *uint256* | _value | The amount of tokens to be burned. |


## *function* NAME

LifTokenV0.NAME() `view` `a3f4df7e`





## *function* transfer

LifTokenV0.transfer(_to, _value) `nonpayable` `a9059cbb`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _to | undefined |
| *uint256* | _value | undefined |


## *function* transferFromAndCall

LifTokenV0.transferFromAndCall(_from, _to, _value, _data) `payable` `c1d34b89`

> Addition to ERC20 token methods. Transfer tokens from one address toanother and make a contract call on the same transaction

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _from | The address which you want to send tokens from |
| *address* | _to | The address which you want to transfer to |
| *uint256* | _value | The amout of tokens to be transferred |
| *bytes* | _data | ABI-encoded contract call to call `_to` address. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |

## *function* approveAndCall

LifTokenV0.approveAndCall(_spender, _value, _data) `payable` `cae9ca51`

> Addition to ERC20 token methods. It allows toapprove the transfer of value and execute a call with the sent data.Beware that changing an allowance with this method brings the risk thatsomeone may use both the old and the new allowance by unfortunatetransaction ordering. One possible solution to mitigate this race conditionis to first reduce the spender's allowance to 0 and set the desired valueafterwards:https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _spender | The address that will spend the funds. |
| *uint256* | _value | The amount of tokens to be spent. |
| *bytes* | _data | ABI-encoded contract call to call `_to` address. |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bool* |  | undefined |

## *function* decreaseApprovalAndCall

LifTokenV0.decreaseApprovalAndCall(_spender, _subtractedValue, _data) `payable` `cb3993be`

> Addition to StandardToken methods. Decrease the amount of tokens thatan owner allowed to a spender and execute a call with the sent data.approve should be called when allowed[_spender] == 0. To decrementallowed value is better to use this function to avoid 2 calls (and wait untilthe first transaction is mined)From MonolithDAO Token.sol

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _spender | The address which will spend the funds. |
| *uint256* | _subtractedValue | The amount of tokens to decrease the allowance by. |
| *bytes* | _data | ABI-encoded contract call to call `_spender` address. |


## *function* increaseApproval

LifTokenV0.increaseApproval(_spender, _addedValue) `nonpayable` `d73dd623`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _spender | undefined |
| *uint256* | _addedValue | undefined |


## *function* allowance

LifTokenV0.allowance(_owner, _spender) `view` `dd62ed3e`

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

LifTokenV0.transferOwnership(newOwner) `nonpayable` `f2fde38b`

> Allows the current owner to transfer control of the contract to a newOwner.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | newOwner | The address to transfer ownership to. |


## *function* SYMBOL

LifTokenV0.SYMBOL() `view` `f76f8d78`




## *event* Pause

LifTokenV0.Pause() `6985a022`



## *event* Unpause

LifTokenV0.Unpause() `7805862f`



## *event* Mint

LifTokenV0.Mint(to, amount) `0f6798a5`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | to | indexed |
| *uint256* | amount | not indexed |

## *event* MintFinished

LifTokenV0.MintFinished() `ae5184fb`



## *event* OwnershipTransferred

LifTokenV0.OwnershipTransferred(previousOwner, newOwner) `8be0079c`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | previousOwner | indexed |
| *address* | newOwner | indexed |

## *event* Approval

LifTokenV0.Approval(owner, spender, value) `8c5be1e5`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | owner | indexed |
| *address* | spender | indexed |
| *uint256* | value | not indexed |

## *event* Transfer

LifTokenV0.Transfer(from, to, value) `ddf252ad`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | from | indexed |
| *address* | to | indexed |
| *uint256* | value | not indexed |


---