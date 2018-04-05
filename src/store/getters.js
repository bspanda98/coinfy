import { util } from 'dop'
import { Fiats } from '/api/fiats'
import { Coins } from '/api/coins'
import { now } from '/api/time'
import state from '/store/state'
import { group } from '/store/router'
import { version } from './../../package.json'
import { sha3 } from 'ethereumjs-util'

export function getTotalAssets(assets) {
    return Object.keys(assets).length
}

export function convertBalance(symbol, value) {
    return getPrice(symbol) * (value || 0)
}

export function getAsset(asset_id) {
    return state.assets[asset_id]
}

export function isAssetRegistered(asset_id) {
    return state.assets.hasOwnProperty(asset_id)
}

export function isAssetRegisteredBySeed(symbol, seed) {
    const hash = sha3(seed).toString('hex')
    const founds = getAssetsAsArray().filter(
        asset =>
            asset.symbol === symbol &&
            asset.hasOwnProperty('seed') &&
            asset.seed.hash === hash
    )
    return founds.length > 0
}

export function isAssetWithPrivateKeyOrSeed(asset_id) {
    return isAssetWithPrivateKey(asset_id) || isAssetWithSeed(asset_id)
}

export function isAssetWithPrivateKey(asset_id) {
    return (
        isAssetRegistered(asset_id) &&
        state.assets[asset_id].hasOwnProperty('private_key')
    )
}

export function isAssetWithSeed(asset_id) {
    return (
        isAssetRegistered(asset_id) &&
        state.assets[asset_id].hasOwnProperty('seed')
    )
}

export function getAssetsAsArray() {
    const assets = []
    Object.keys(state.assets).forEach(asset_id => {
        assets.push(state.assets[asset_id])
    })
    return assets
}

export function getSymbolsFromAssets(assets = state.assets) {
    const symbols = Object.keys(assets).map(asset_id => assets[asset_id].symbol)
    return symbols.filter((item, pos) => symbols.indexOf(item) == pos)
}

export function isValidAsset(asset) {
    try {
        const symbol = asset.symbol
        const addr = asset.address
        const address = typeof addr == 'string' ? addr : addr[addr.length - 1]
        return Coins[symbol].isAddressCheck(address)
    } catch (e) {
        return false
    }
}

export function generateDefaultAsset(object = {}) {
    let asset = {
        // type: type,
        // symbol: symbol,
        // address: address,
        // addresses: [object.address],
        label: '',
        balance: 0,
        printed: false, // wallet printed?
        state: {
            // this must be removed when exporting or saving in localstorage
            shall_we_fetch_summary: true,
            fetching_summary: false
        },
        summary: {
            // summary data, must be removed when exporting
        }
    }

    asset = util.merge(asset, object)
    if (!Array.isArray(asset.addresses)) asset.addresses = [object.address]
    // console.log(asset)
    return asset
}

export function generateDefaultBackup(object = {}) {
    const backup = {
        date: now(),
        network: state.network,
        v: version
            .split('.')
            .slice(0, 2)
            .join('.'),
        assets: {},
        customs: {}
    }
    return util.merge(backup, object)
}

export function formatCurrency(value, n = 0, currencySymbol = state.fiat) {
    return Fiats[currencySymbol].format(value, n)
}

export function getNextAssetId(asset) {
    const symbol = asset.symbol
    const address = asset.addresses[0]
    const init_id = `${symbol}-${address}`
    let index = 1
    let id = init_id
    while (state.assets.hasOwnProperty(id)) {
        id = `${init_id}-${index++}`
    }
    return id
}

export function getAssetId({ symbol, address }) {
    // return `${symbol}-${address}`
    for (let asset_id in state.assets)
        if (
            state.assets[asset_id].symbol === symbol &&
            state.assets[asset_id].addresses.includes(address)
        )
            return asset_id
}

export function getPrice(symbol) {
    return state && state.prices && state.prices[symbol]
        ? state.prices[symbol]
        : 0
}

export function getPrivateKey(asset_id, password) {
    const { private_key } = decrypt(asset_id, password)
    return private_key
}

export function decrypt(asset_id, password) {
    const asset = getAsset(asset_id)
    const Coin = Coins[asset.symbol]

    if (isAssetWithSeed(asset_id)) {
        return Coin.decryptPrivateKeyFromSeed(
            asset.addresses,
            asset.seed,
            password
        )
    } else {
        const private_key = Coin.decryptPrivateKey(
            asset.address,
            asset.private_key,
            password
        )
        return { private_key }
    }

    return private_key
}

export function getLabelOrAddress(asset) {
    if (typeof asset == 'string') asset = getAsset(asset)
    return asset.label.length > 0 ? asset.label : asset.address
}

export function getReusableSeeds(symbol) {
    const reusables = []
    const groups = {}
    const assets = getAssetsAsArray().filter(asset =>
        asset.hasOwnProperty('seed')
    )

    assets.forEach(asset => {
        const hash = asset.seed.hash
        if (!groups.hasOwnProperty(hash)) groups[hash] = []
        groups[hash].push(asset)
    })

    for (let hash in groups) {
        const group = groups[hash]
        if (group.filter(asset => asset.symbol === symbol).length === 0)
            reusables.push(group)
    }

    return reusables
}

export function getParamsFromLocation() {
    return group.getParams(state.location)
}

export function getRouteFromLocation() {
    return group.getRoute(state.location)
}
