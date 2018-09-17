* [LifChannels](#lifchannels)
  * [closeChannel](#function-closechannel)
  * [uncooperativeClose](#function-uncooperativeclose)
  * [closingRequests](#function-closingrequests)
  * [cooperativeClose](#function-cooperativeclose)
  * [getChannelInfo](#function-getchannelinfo)
  * [channels](#function-channels)
  * [challengeTime](#function-challengetime)
  * [getChannelId](#function-getchannelid)
  * [getSignerOfBalanceHash](#function-getsignerofbalancehash)
  * [generateKeccak256](#function-generatekeccak256)
  * [generateBalanceHash](#function-generatebalancehash)
  * [openChannel](#function-openchannel)
  * [token](#function-token)
  * [ChannelCreated](#event-channelcreated)
  * [ChannelCloseRequested](#event-channelcloserequested)
  * [ChannelClosed](#event-channelclosed)

# LifChannels


## *function* closeChannel

LifChannels.closeChannel(receiver, nonce) `nonpayable` `084992a6`

> Close a channel with an existing closing request

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | receiver | address, the receiver of the channel |
| *uint8* | nonce | uint8, the nonce number of the channel |


## *function* uncooperativeClose

LifChannels.uncooperativeClose(receiver, nonce, balance) `nonpayable` `3cc7508f`

> Starts a close channel request form the sender

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | receiver | address, the receiver of the channel |
| *uint8* | nonce | uint8, the nonce number of the channel |
| *uint256* | balance | uint256, the final balance of teh receiver |


## *function* closingRequests

LifChannels.closingRequests() `view` `49596462`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* |  | undefined |


## *function* cooperativeClose

LifChannels.cooperativeClose(receiver, nonce, balance, balanceMsgSig, closingSig) `nonpayable` `523898f4`

> Close a channel with the agreement of the sender and receiver

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | receiver | address, the receiver of the channel |
| *uint8* | nonce | uint8, the nonce number of the channel |
| *uint256* | balance | undefined |
| *bytes* | balanceMsgSig | bytes, the signature of the sender |
| *bytes* | closingSig | bytes, the signature of the receiver |


## *function* getChannelInfo

LifChannels.getChannelInfo(sender, receiver, nonce) `view` `6f204f20`

> Get the channel info

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | sender | address, the sender of the channel |
| *address* | receiver | address, the receiver of the channel |
| *uint8* | nonce | uint8, the nonce number of the channel |


## *function* channels

LifChannels.channels() `view` `7a7ebd7b`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* |  | undefined |


## *function* challengeTime

LifChannels.challengeTime() `view` `a4727272`





## *function* getChannelId

LifChannels.getChannelId(sender, receiver, nonce) `pure` `cc20d075`

> Generate a channel id

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | sender | address, the sender in the channel |
| *address* | receiver | address, the receiver in the channel |
| *uint8* | nonce | uint8, the nonce number of the channel |


## *function* getSignerOfBalanceHash

LifChannels.getSignerOfBalanceHash(receiver, nonce, balance, msgSigned) `view` `f3e68264`

> Get the signer of a balance hash signed with a generated hash on chain

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | receiver | address, the receiver to hash |
| *uint8* | nonce | uint8, the nonce number of the channel |
| *uint256* | balance | uint256, the balance to hash |
| *bytes* | msgSigned | bytes, the balance hash signed |


## *function* generateKeccak256

LifChannels.generateKeccak256(message) `pure` `f459eb61`

> Generate a keccak256 hash

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes* | message | bytes, the mesage to hash |


## *function* generateBalanceHash

LifChannels.generateBalanceHash(receiver, nonce, balance) `view` `f568006f`

> Generate a hash balance for an address

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | receiver | address, the receiver to hash |
| *uint8* | nonce | uint8, the nonce number of the channel |
| *uint256* | balance | uint256, the balance to hash |


## *function* openChannel

LifChannels.openChannel(receiver, deposit, nonce) `nonpayable` `f5eeaea3`

> Creates a channel between the msg.sender and the receiver

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | receiver | address, the receiver of the channel |
| *uint256* | deposit | uint256, the balance taht I want to load in the channel |
| *uint8* | nonce | uint8, the nonce number of the channel |


## *function* token

LifChannels.token() `view` `fc0c546a`





## *event* ChannelCreated

LifChannels.ChannelCreated(sender, receiver, nonce, deposit) `d8b44cc7`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | sender | indexed |
| *address* | receiver | indexed |
| *uint8* | nonce | indexed |
| *uint256* | deposit | not indexed |

## *event* ChannelCloseRequested

LifChannels.ChannelCloseRequested(sender, receiver, nonce, balance) `2cdb8877`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | sender | indexed |
| *address* | receiver | indexed |
| *uint8* | nonce | indexed |
| *uint256* | balance | not indexed |

## *event* ChannelClosed

LifChannels.ChannelClosed(sender, receiver, nonce, balance) `fff17c72`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | sender | indexed |
| *address* | receiver | indexed |
| *uint8* | nonce | indexed |
| *uint256* | balance | not indexed |


---