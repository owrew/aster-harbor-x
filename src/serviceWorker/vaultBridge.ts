/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. See LICENSE.
 * Manual, per-video access to Media Harvest's native lookup and download services.
 */
import { tweetToAvailableTweetMediaFiles } from '#domain/factories/tweetToTweetMediaFiles'
import { tweetToDownloadHistory } from '#domain/factories/tweetToDownloadHistory'
import { DownloadTarget } from '#domain/valueObjects/downloadTarget'
import { Tweet } from '#domain/valueObjects/tweet'
import { TweetInfo } from '#domain/valueObjects/tweetInfo'
import { BrowserDownloadMediaFile } from '#infra/useCases/browserDownloadMediaFile'
import { Aria2DownloadMediaFile } from '#infra/useCases/aria2DownloadMediaFile'
import { getEventPublisher } from '#infra/eventPublisher'
import { downloadHistoryRepo, downloadSettingsRepo, filenameSettingsRepo,
  nativeFetchTweetSolution, tweetResponseCache } from '#provider'
import { RequestTransactionIdMessage } from '#libs/webExtMessage/messages/requestTransactionId'
import { sendTabMessage } from '#libs/webExtMessage'
import { toErrorResult, toSuccessResult } from '#utils/result'
import Browser from 'webextension-polyfill'

type Video = { id: string; url: string; type: string; serial: number; filename?: string }
const cached = new Map<string, Tweet>()
const safeVideo = (url: string) => {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname === 'video.twimg.com' && /\.mp4$/i.test(u.pathname)
  } catch { return false }
}
const bridge = {
  async resolve(id: string) {
    const entry = await tweetResponseCache.get(id)
    let tweet = entry.value
      ? entry.value instanceof Tweet ? entry.value : entry.value.mapBy(p => p.tweet)
      : undefined
    if (!tweet) {
      const tabs = await Browser.tabs.query({ url: ['https://x.com/*', 'https://www.x.com/*'] })
      const tab = tabs.find(t => t.active) || tabs[0]
      if (typeof tab?.id !== 'number') throw new Error('Keep a signed-in X tab open, then try Find videos.')
      const tabId = tab.id
      const result = await nativeFetchTweetSolution.process({
        tweetId: id,
        transactionIdProvider: async (path: string, method: string) => {
          const response = await sendTabMessage(tabId)(new RequestTransactionIdMessage({ path, method }))
          return response.status === 'ok'
            ? toSuccessResult(response.payload.transactionId)
            : toErrorResult(new Error('Open the post in X to initialize its download session.'))
        },
      })
      if (result.error) {
        const error = result.error as Error & { cause?: { code?: number; statusCode?: number } }
        const status = error.cause?.code || error.cause?.statusCode
        if (status === 429 || error.name === 'InsufficientQuota')
          await Browser.storage.local.set({ cooldownUntil: Date.now() + 15 * 60 * 1000, lastLimit: 429 })
        throw new Error(error.message || 'Video lookup failed. Open the post in X and try its download button.')
      }
      tweet = result.value
    }
    if (!tweet) throw new Error('This post is unavailable.')
    if (cached.size >= 100) cached.delete(cached.keys().next().value as string)
    cached.set(id, tweet)
    const naming = await filenameSettingsRepo.get()
    return tweetToAvailableTweetMediaFiles(tweet).filter(f => f.isVideo).map(f => f.mapBy(p => ({
      id, url: p.source, type: 'video', serial: p.serial, filename: naming.makeFilename(f),
    }))).filter(v => safeVideo(v.url))
  },
  async download(id: string, video: Video) {
    if (!safeVideo(video.url)) throw new Error('No supported MP4 URL is available for this video.')
    const settings = await downloadSettingsRepo.get()
    const info = new TweetInfo({ tweetId: id, screenName: 'i' })
    const downloader = settings.enableAria2
      ? new Aria2DownloadMediaFile(info)
      : new BrowserDownloadMediaFile(info, settings.askWhereToSave)
    const filename = video.filename || 'Media Harvester/' + id + '_video' + video.serial + '.mp4'
    await downloader.process({ target: new DownloadTarget({ url: video.url, filename }) })
    await getEventPublisher().publishAll(...downloader.events)
    if (!downloader.isOk) throw new Error('The downloader did not accept this video.')
    const tweet = cached.get(id)
    if (tweet) await downloadHistoryRepo.save(tweetToDownloadHistory(tweet))
    return { dispatched: true }
  },
}
Object.assign(globalThis, { dmVaultMediaHarvest: bridge })
