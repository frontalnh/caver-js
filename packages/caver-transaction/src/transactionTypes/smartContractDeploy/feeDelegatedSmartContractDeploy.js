/*
    Copyright 2020 The caver-js Authors
    This file is part of the caver-js library.

    The caver-js library is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    The caver-js library is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with the caver-js. If not, see <http://www.gnu.org/licenses/>.
*/

const _ = require('lodash')
const RLP = require('eth-lib/lib/rlp')
const Bytes = require('eth-lib/lib/bytes')
const AbstractFeeDelegatedTransaction = require('../abstractFeeDelegatedTransaction')
const { TX_TYPE_STRING, TX_TYPE_TAG, CODE_FORMAT, getCodeFormatTag } = require('../../transactionHelper/transactionHelper')
const utils = require('../../../../caver-utils/src')

function _decode(rlpEncoded) {
    rlpEncoded = utils.addHexPrefix(rlpEncoded)
    if (!rlpEncoded.startsWith(TX_TYPE_TAG.TxTypeFeeDelegatedSmartContractDeploy))
        throw new Error(
            `Cannot decode to FeeDelegatedSmartContractDeploy. The prefix must be ${TX_TYPE_TAG.TxTypeFeeDelegatedSmartContractDeploy}: ${rlpEncoded}`
        )

    const typeDettached = `0x${rlpEncoded.slice(4)}`
    const [nonce, gasPrice, gas, to, value, from, input, humanReadable, codeFormat, signatures, feePayer, feePayerSignatures] = RLP.decode(
        typeDettached
    )
    return {
        nonce: utils.trimLeadingZero(nonce),
        gasPrice: utils.trimLeadingZero(gasPrice),
        gas: utils.trimLeadingZero(gas),
        to,
        value: utils.trimLeadingZero(value),
        from,
        input,
        humanReadable: humanReadable === '0x1',
        codeFormat,
        signatures,
        feePayer,
        feePayerSignatures,
    }
}

/**
 * Represents a fee delegated smart contract deploy transaction.
 * Please refer to https://docs.klaytn.com/klaytn/design/transactions/fee-delegation#txtypefeedelegatedsmartcontractdeploy to see more detail.
 * @class
 */
class FeeDelegatedSmartContractDeploy extends AbstractFeeDelegatedTransaction {
    /**
     * decodes the RLP-encoded string and returns a FeeDelegatedSmartContractDeploy transaction instance.
     *
     * @param {string} rlpEncoded The RLP-encoded fee delegated smart contract deploy transaction.
     * @return {FeeDelegatedSmartContractDeploy}
     */
    static decode(rlpEncoded) {
        return new FeeDelegatedSmartContractDeploy(_decode(rlpEncoded))
    }

    /**
     * Creates a fee delegated smart contract deploy transaction.
     * @constructor
     * @param {object|string} createTxObj - The parameters to create a FeeDelegatedSmartContractDeploy transaction. This can be an object defining transaction information, or it can be an RLP-encoded string.
     *                                      If it is an RLP-encoded string, decode it to create a transaction instance.
     *                               The object can define `from`, `to`, `value`, `input`, `humanReadable`, `codeForamt`,
     *                               `nonce`, `gas`, `gasPrice`, `signatures`, `feePayer`, `feePayerSignatures` and `chainId`.
     */
    constructor(createTxObj) {
        if (_.isString(createTxObj)) createTxObj = _decode(createTxObj)
        super(TX_TYPE_STRING.TxTypeFeeDelegatedSmartContractDeploy, createTxObj)
        this.to = createTxObj.to || '0x'
        this.value = createTxObj.value || '0x0'

        if (createTxObj.input && createTxObj.data)
            throw new Error(`'input' and 'data' properties cannot be defined at the same time, please use either 'input' or 'data'.`)

        this.input = createTxObj.input || createTxObj.data

        this.humanReadable = createTxObj.humanReadable !== undefined ? createTxObj.humanReadable : false
        this.codeFormat = createTxObj.codeFormat !== undefined ? createTxObj.codeFormat : CODE_FORMAT.EVM
    }

    /**
     * @type {string}
     */
    get to() {
        return this._to
    }

    set to(address) {
        if (address !== '0x' && !utils.isAddress(address)) throw new Error(`Invalid address of to: ${address}`)
        this._to = address.toLowerCase()
    }

    /**
     * @type {string}
     */
    get value() {
        return this._value
    }

    set value(val) {
        this._value = utils.numberToHex(val)
    }

    /**
     * @type {string}
     */
    get input() {
        return this._input
    }

    set input(input) {
        if (!input || !utils.isHex(input)) throw new Error(`Invalid input data ${input}`)
        this._input = utils.addHexPrefix(input)
    }

    /**
     * @type {string}
     */
    get data() {
        return this._input
    }

    set data(data) {
        this._input = data
    }

    /**
     * @type {boolean}
     */
    get humanReadable() {
        return this._humanReadable
    }

    set humanReadable(hr) {
        if (!_.isBoolean(hr)) throw new Error(`Invalid humanReadable ${hr}`)
        this._humanReadable = hr
    }

    /**
     * @type {string}
     */
    get codeFormat() {
        return this._codeFormat
    }

    set codeFormat(cf) {
        this._codeFormat = getCodeFormatTag(cf)
    }

    /**
     * Returns the RLP-encoded string of this transaction (i.e., rawTransaction).
     * @return {string}
     */
    getRLPEncoding() {
        this.validateOptionalValues()
        const signatures = this.signatures.map(sig => sig.encode())
        const feePayerSignatures = this.feePayerSignatures.map(sig => sig.encode())

        return (
            TX_TYPE_TAG.TxTypeFeeDelegatedSmartContractDeploy +
            RLP.encode([
                Bytes.fromNat(this.nonce),
                Bytes.fromNat(this.gasPrice),
                Bytes.fromNat(this.gas),
                this.to.toLowerCase(),
                Bytes.fromNat(this.value),
                this.from.toLowerCase(),
                this.input,
                Bytes.fromNat(this.humanReadable === true ? '0x1' : '0x0'),
                Bytes.fromNat(this.codeFormat),
                signatures,
                this.feePayer.toLowerCase(),
                feePayerSignatures,
            ]).slice(2)
        )
    }

    /**
     * Returns the RLP-encoded string to make the signature of this transaction.
     * @return {string}
     */
    getCommonRLPEncodingForSignature() {
        this.validateOptionalValues()

        return RLP.encode([
            TX_TYPE_TAG.TxTypeFeeDelegatedSmartContractDeploy,
            Bytes.fromNat(this.nonce),
            Bytes.fromNat(this.gasPrice),
            Bytes.fromNat(this.gas),
            this.to.toLowerCase(),
            Bytes.fromNat(this.value),
            this.from.toLowerCase(),
            this.input,
            Bytes.fromNat(this.humanReadable === true ? '0x1' : '0x0'),
            Bytes.fromNat(this.codeFormat),
        ])
    }
}

module.exports = FeeDelegatedSmartContractDeploy
