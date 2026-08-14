package com.ghostMessage.service;

import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MessageCacheService {

    private final CacheManager cacheManager;

    public void evictPageCaches(String pageUrl, String anchorKey) {
        String normPageUrl = normalize(pageUrl);
        String normAnchorKey = normalize(anchorKey);

        var pageCache = cacheManager.getCache("pageMessages");
        if (pageCache != null) {
            pageCache.evict(normPageUrl);
        }

        var tooltipCache = cacheManager.getCache("tooltipMessages");
        if (tooltipCache != null) {
            tooltipCache.evict(normPageUrl + ":" + normAnchorKey);
        }
    }

    private String normalize(String url) {
        return url.toLowerCase().replaceAll("/$", "");
    }
}
