import { api } from '../api/api';
import { CacheableObject } from './cacheableObject';
import { globals } from '@globals';
import { User } from '@types';
import { SavedPostsCache } from './savedPostsCache';
import { cloutApi } from '@services/api/cloutApi';

const loggedInUserCacheableObject = new CacheableObject<User>(
    () => api.getProfile([globals.user.publicKey]),
    p_response => {
        const user = p_response.UserList[0] as User;

        if (user.ProfileEntryResponse && !user.ProfileEntryResponse.ProfilePic) {
            user.ProfileEntryResponse.ProfilePic = api.getSingleProfileImage(globals.user.publicKey);
        }

        return user;
    },
    600
);

const addFollower = async (p_publicKey: string) => {
    const user = await loggedInUserCacheableObject.getData().catch(() => undefined);

    if (user) {
        if (!user.PublicKeysBase58CheckFollowedByUser) {
            user.PublicKeysBase58CheckFollowedByUser = [p_publicKey];
        } else {
            const publicKeyExists = user.PublicKeysBase58CheckFollowedByUser.indexOf(p_publicKey) !== -1;
            if (!publicKeyExists) {
                user.PublicKeysBase58CheckFollowedByUser.push(p_publicKey);
            }
        }
    }
};

const removeFollower = async (p_publicKey: string) => {
    const user = await loggedInUserCacheableObject.getData().catch(() => undefined);
    if (user) {
        if (user.PublicKeysBase58CheckFollowedByUser) {
            const publicKeyIndex = user.PublicKeysBase58CheckFollowedByUser.indexOf(p_publicKey);
            if (publicKeyIndex !== -1) {
                user.PublicKeysBase58CheckFollowedByUser.splice(publicKeyIndex, 1);
            }
        }
    }
};

const exchangeRate = new CacheableObject<{ SatoshisPerDeSoExchangeRate: number, USDCentsPerDeSoExchangeRate: number }>(
    () => api.getExchangeRate(),
    p_response => {
        globals.exchangeRate = p_response;
        return p_response;
    },
    300
);

interface Cache {
    user: CacheableObject<User>;
    addFollower: (publicKey: string) => void;
    removeFollower: (publicKey: string) => void;
    savedPosts: SavedPostsCache;
    pinnedPost: CacheableObject<{ postHashHex: string }>;
    exchangeRate: CacheableObject<{ SatoshisPerDeSoExchangeRate: number, USDCentsPerDeSoExchangeRate: number }>;
}

export let cache: Cache;

const pinnedPostCacheableObject = new CacheableObject<{ postHashHex: string }>(
    () => cloutApi.getPinnedPost(globals.user.publicKey),
    p_response => p_response,
    600
);

export function initCache() {
    cache = {
        user: loggedInUserCacheableObject,
        addFollower: addFollower,
        removeFollower: removeFollower,
        savedPosts: new SavedPostsCache(),
        pinnedPost: pinnedPostCacheableObject,
        exchangeRate: exchangeRate
    };
}

initCache();
