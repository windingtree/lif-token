* [LifToken](#liftoken)
  * [approve](#function-approve)
  * [totalSupply](#function-totalsupply)
  * [transferFrom](#function-transferfrom)
  * [decreaseApproval](#function-decreaseapproval)
  * [balanceOf](#function-balanceof)
  * [transfer](#function-transfer)
  * [increaseApproval](#function-increaseapproval)
  * [allowance](#function-allowance)
  * [Approval](#event-approval)
  * [Transfer](#event-transfer)

# LifToken


## *function* approve

LifToken.approve(_spender, _value) `nonpayable` `095ea7b3`

> Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.   * Beware that changing an allowance with this method brings the risk that someone may use both the old and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards: https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729

Inputs

| | | |
|-|-|-|
| *address* | _spender | The address which will spend the funds. |
| *uint256* | _value | The amount of tokens to be spent. |


## *function* totalSupply

LifToken.totalSupply() `view` `18160ddd`

> total number of tokens in existence




## *function* transferFrom

LifToken.transferFrom(_from, _to, _value) `nonpayable` `23b872dd`

> Transfer tokens from one address to another

Inputs

| | | |
|-|-|-|
| *address* | _from | address The address which you want to send tokens from |
| *address* | _to | address The address which you want to transfer to |
| *uint256* | _value | uint256 the amount of tokens to be transferred |


## *function* decreaseApproval

LifToken.decreaseApproval(_spender, _subtractedValue) `nonpayable` `66188463`

> Decrease the amount of tokens that an owner allowed to a spender.   * approve should be called when allowed[_spender] == 0. To decrement allowed value is better to use this function to avoid 2 calls (and wait until the first transaction is mined) From MonolithDAO Token.sol

Inputs

| | | |
|-|-|-|
| *address* | _spender | The address which will spend the funds. |
| *uint256* | _subtractedValue | The amount of tokens to decrease the allowance by. |


## *function* balanceOf

LifToken.balanceOf(_owner) `view` `70a08231`

> Gets the balance of the specified address.

Inputs

| | | |
|-|-|-|
| *address* | _owner | The address to query the the balance of. |

Outputs

| | | |
|-|-|-|
| *uint256* | balance | undefined |

## *function* transfer

LifToken.transfer(_to, _value) `nonpayable` `a9059cbb`

> transfer token for a specified address

Inputs

| | | |
|-|-|-|
| *address* | _to | The address to transfer to. |
| *uint256* | _value | The amount to be transferred. |


## *function* increaseApproval

LifToken.increaseApproval(_spender, _addedValue) `nonpayable` `d73dd623`

> Increase the amount of tokens that an owner allowed to a spender.   * approve should be called when allowed[_spender] == 0. To increment allowed value is better to use this function to avoid 2 calls (and wait until the first transaction is mined) From MonolithDAO Token.sol

Inputs

| | | |
|-|-|-|
| *address* | _spender | The address which will spend the funds. |
| *uint256* | _addedValue | The amount of tokens to increase the allowance by. |


## *function* allowance

LifToken.allowance(_owner, _spender) `view` `dd62ed3e`

> Function to check the amount of tokens that an owner allowed to a spender.

Inputs

| | | |
|-|-|-|
| *address* | _owner | address The address which owns the funds. |
| *address* | _spender | address The address which will spend the funds. |

Outputs

| | | |
|-|-|-|
| *uint256* |  | undefined |
## *event* Approval

LifToken.Approval(owner, spender, value) `8c5be1e5`

Arguments

| | | |
|-|-|-|
| *address* | owner | indexed |
| *address* | spender | indexed |
| *uint256* | value | not indexed |

## *event* Transfer

LifToken.Transfer(from, to, value) `ddf252ad`

Arguments

| | | |
|-|-|-|
| *address* | from | indexed |
| *address* | to | indexed |
| *uint256* | value | not indexed |


---