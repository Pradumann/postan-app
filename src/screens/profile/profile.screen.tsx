import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, SectionList, RefreshControl } from 'react-native';
import { ProfileScreenOptionsComponent } from './profileScreenOptions.component';
import { CreatorCoinHODLerComponent } from '@components/creatorCoinHODLer.component';
import  ProfileNotCompletedComponent  from '@components/profileNotCompleted.component';
import { TabConfig, TabsComponent } from '@components/tabs.component';
import { globals, navigatorGlobals } from '@globals';
import { api, cache, calculateDeSoInUSD } from '@services';
import { CreatorCoinHODLer, DiamondSender, Post, Profile, ProfileScreenTab } from '@types';
import { ProfileStats } from './profileStats.component';
import { themeStyles } from '@styles/globalColors';
import { ProfileCard } from './profileCard.component';
import { DiamondSenderComponent } from './diamondSender.component';
import { PostComponent } from '@components/post/post.component';
import OwnProfileOptionsComponent from './ownProfileOptions.component';
import { useFocusEffect } from '@react-navigation/core';
import { cloutApi } from '@services/api/cloutApi';
import CloutFeedLoader from '@components/loader/cloutFeedLoader.component';
import { ParamListBase, RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type Route = {
    route: {
        params: {
            username: string;
            deletedPost: string | undefined;
            profileUpdated: boolean;
        }
    }
};

let tempTab = '';

export function ProfileScreen({ route }: Route): JSX.Element {

    const navigation = useNavigation<StackNavigationProp<ParamListBase>>();

    let username = route.params?.username;
    if (!username) {
        username = globals.user.username;
    }

    const isLoggedInUser = username === globals.user.username;

    const [isLoading, setLoading] = useState<boolean>(true);
    const [isLoadingMore, setLoadingMore] = useState<boolean>(false);
    const [noMorePosts, setNoMorePosts] = useState<boolean>(false);
    const [noMoreHolders, setNoMoreHolders] = useState<boolean>(false);
    const [canCreateProfile, setCanCreateProfile] = useState<boolean>(false);
    const [profile, setProfile] = useState<Profile>({} as Profile);
    const [fullProfile, setFullProfile] = useState<Profile | undefined>(undefined);
    const [diamondSenders, setDiamondSenders] = useState<DiamondSender[] | undefined>(undefined);
    const [coinPrice, setCoinPrice] = useState<number>(0);
    const [tabs, setTabs] = useState<TabConfig[]>([]);
    const [selectedTab, setSelectedTab] = useState<ProfileScreenTab>(ProfileScreenTab.Posts);
    const [sections, setSections] = useState<any>({});
    const sectionListRef: React.RefObject<SectionList> = useRef(null);
    const pinnedPostHashHex = useRef('');
    const isMounted = useRef<boolean>(true);

    const reload = { posts: () => { undefined; }, creatorCoin: () => { undefined; }, stats: () => { undefined; } };

    if (route.params?.deletedPost) {
        const newPosts = profile.Posts.filter((post: Post) => post.PostHashHex !== route.params.deletedPost);
        profile.Posts = newPosts;

        if (isMounted) {
            setProfile(profile);
            configureSections(profile, selectedTab);
            route.params.deletedPost = undefined;
        }
    }

    if (!route.params) {
        navigatorGlobals.refreshProfile = () => {
            if (sectionListRef.current) {
                sectionListRef.current.scrollToLocation({ sectionIndex: 0, itemIndex: 0, animated: true, viewPosition: 0 });
            }
        };
    }

    useEffect(
        () => {
            configureTabs();
            loadData();

            return () => {
                isMounted.current = false;
            };
        },
        []
    );

    useFocusEffect(
        React.useCallback(
            () => {
                const profileUpdated = route.params?.profileUpdated;

                if (profileUpdated) {
                    username = route.params?.username;
                    if (!username) {
                        username = globals.user.username;
                    }
                    loadData();
                    navigation.setParams({ profileUpdated: false });
                }
            },
            [route.params?.profileUpdated]
        )
    );

    function configureTabs(): void {
        const newTabs: TabConfig[] = [
            {
                name: ProfileScreenTab.Posts
            },
            {
                name: ProfileScreenTab.Diamonds
            }
        ];

        if (globals.investorFeatures) {
            newTabs.push(
                {
                    name: ProfileScreenTab.Stats
                }
            );
        }

        setTabs(newTabs);
    }

    function loadData(): void {
        if (isMounted) {
            setLoading(true);
            setNoMoreHolders(false);
            setNoMorePosts(false);
            setFullProfile(undefined);
            setDiamondSenders(undefined);
        }

        if (!username) {
            if (isMounted) {
                setLoading(false);
                setCanCreateProfile(false);
                return;
            }
        }

        Promise.all(
            [
                cache.exchangeRate.getData(),
                loadSingleProfile()
            ]
        ).then(
            async responses => {
                if (isMounted) {
                    const profile = responses[1];
                    const posts = await loadPosts(profile.PublicKeyBase58Check);
                    profile.Posts = posts;

                    for (const post of profile.Posts) {
                        post.ProfileEntryResponse = getProfileCopy(profile);
                    }

                    if (isMounted) {
                        setProfile(profile);
                        setSelectedTab(ProfileScreenTab.Posts);
                        configureSections(profile, ProfileScreenTab.Posts);
                        setLoading(false);
                    }
                }
            }
        ).catch(error => globals.defaultHandleError(error));
    }

    async function loadSingleProfile(): Promise<Profile> {
        const response = await api.getSingleProfile(username);
        const newProfile = response.Profile as Profile;

        if (newProfile) {
            const calculatedCoinPrice = calculateDeSoInUSD(newProfile.CoinPriceDeSoNanos);
            newProfile.ProfilePic = api.getSingleProfileImage(newProfile.PublicKeyBase58Check + '?' + new Date().toISOString());

            if (isMounted) {
                setCanCreateProfile(true);
                setCoinPrice(calculatedCoinPrice);
            }
        }
        return newProfile;
    }

    async function loadPosts(publicKey: string): Promise<Post[]> {
        const response = await api.getProfilePostsBatch(globals.user.publicKey, username, 10);
        let posts = response.Posts as Post[] ?? [];

        try {
            const pinnedPost = await cloutApi.getPinnedPost(publicKey);
            if (pinnedPost?.postHashHex) {
                pinnedPostHashHex.current = pinnedPost?.postHashHex;
                const post = await api.getSinglePost(globals.user.publicKey, pinnedPost.postHashHex, false, 0, 0);
                if (post?.PostFound) {
                    posts.unshift(post.PostFound);
                }
            } else {
                pinnedPostHashHex.current = '';
            }
        } catch {
            pinnedPostHashHex.current = '';
        }

        posts = posts.filter((post, index) => !post.IsHidden && (post.PostHashHex !== pinnedPostHashHex.current || index === 0));
        return posts;
    }

    function configureSections(profile: Profile, selectedTab: string, fullProfile?: Profile | undefined, diamondSenders?: DiamondSender[] | undefined): void {
        let tabData: DiamondSender[] | Post[] | Profile[] | CreatorCoinHODLer[] | null[] = [null];
        let renderItem: ({ item }: any) => void = () => undefined;

        if (selectedTab === ProfileScreenTab.Posts) {
            if (profile.Posts?.length > 0) {
                tabData = profile.Posts;
                renderItem = ({ item }: { item: Post }) => <PostComponent
                    route={route as RouteProp<ParamListBase, string>}
                    navigation={navigation}
                    post={item}
                    isPinned={item.PostHashHex === pinnedPostHashHex.current} />;
            } else {
                renderItem = () => <View style={styles.noPostsContainer}>
                    <Text style={[styles.noPostsText, themeStyles.fontColorSub]}>No posts yet</Text>
                </View>;
            }

        } else if (selectedTab === ProfileScreenTab.CreatorCoin) {
            if (profile.UsersThatHODL) {
                tabData = profile.UsersThatHODL;
                renderItem = ({ item }: { item: CreatorCoinHODLer }) => <CreatorCoinHODLerComponent
                    isHolder={true}
                    creatorCoinPrice={coinPrice}
                    userWhoHODL={item} />;
            } else {
                renderItem = () => <ActivityIndicator
                    style={styles.activityIndicator}
                    color={themeStyles.fontColorMain.color}
                />;
            }
        } else if (selectedTab === ProfileScreenTab.Stats) {
            if (fullProfile) {
                renderItem = () => <ProfileStats
                    profile={fullProfile} followers={[]} reload={reload} />;
            } else {
                renderItem = () => <ActivityIndicator
                    style={styles.activityIndicator}
                    color={themeStyles.fontColorMain.color}
                />;
            }
        } else if (selectedTab === ProfileScreenTab.Diamonds) {
            if (diamondSenders) {
                tabData = diamondSenders;
                renderItem = ({ item }: { item: DiamondSender }) => <DiamondSenderComponent navigation={navigation} diamondSender={item} />;
            } else {
                renderItem = () => <ActivityIndicator
                    style={styles.activityIndicator}
                    color={themeStyles.fontColorMain.color}
                />;
            }
        }

        const newSections = [
            {
                profileCard: true,
                data: [null]
            },
            {
                profileCard: false,
                data: tabData,
                renderItem: renderItem
            }
        ];

        if (isMounted) {
            setSections(newSections);
        }
    }

    function goToChat(): void {
        const newProfile: Profile = getProfileCopy(profile);

        navigation.navigate(
            'MessageStack',
            {
                screen: 'Chat',
                params: {
                    contactWithMessages: {
                        Messages: [],
                        ProfileEntryResponse: newProfile,
                        NumMessagesRead: 0,
                        PublicKeyBase58Check: newProfile.PublicKeyBase58Check
                    },
                    loadMessages: true
                }
            }
        );
    }

    async function onTabClick(tabName: string): Promise<void> {
        tempTab = tabName;
        setSelectedTab(tabName as ProfileScreenTab);

        if (sectionListRef.current) {
            sectionListRef.current.scrollToLocation(
                {
                    sectionIndex: 1,
                    itemIndex: 0,
                    animated: false,
                    viewPosition: 1
                }
            );
        }

        let newFullProfile = fullProfile;
        let newDiamondSenders = diamondSenders;

        if (tabName === ProfileScreenTab.CreatorCoin && !profile.UsersThatHODL) {
            configureSections(profile, tabName);
            await loadHolders();
        } else if (tabName === ProfileScreenTab.Stats && !newFullProfile) {
            configureSections(profile, tabName);
            newFullProfile = await loadFullProfile();
        } else if (tabName === ProfileScreenTab.Diamonds && !newDiamondSenders) {
            configureSections(profile, tabName);
            newDiamondSenders = await loadDiamondSenders();
        }

        if (isMounted) {
            setProfile(profile);

            if (tempTab === tabName) {
                configureSections(profile, tabName, newFullProfile, newDiamondSenders);
            }

            if (newFullProfile) {
                setFullProfile(newFullProfile);
            }

            if (newDiamondSenders) {
                setDiamondSenders(newDiamondSenders);
            }
        }
    }

    async function loadHolders() {
        await api.getProfileHolders(
            username, 25
        ).then(
            response => {
                const holders = response.Hodlers as CreatorCoinHODLer[] ?? [];
                profile.UsersThatHODL = holders;
                if (profile.UsersThatHODL.length < 25) {
                    setNoMoreHolders(true);
                }
            }
        ).catch(error => globals.defaultHandleError(error));
    }

    async function loadFullProfile() {
        const response = await api.getProfilePosts(globals.user.publicKey, username, true);
        const newFullProfile: Profile = response.ProfilesFound[0];

        return newFullProfile;
    }

    async function loadDiamondSenders() {
        const response = await api.getProfileDiamonds(profile.PublicKeyBase58Check);
        const newDiamondSenders: DiamondSender[] = response.DiamondSenderSummaryResponses ?? [];
        return newDiamondSenders;
    }

    async function handleLoadMore() {
        try {
            if (isLoadingMore) {
                return;
            }

            let loading = false;
            if (selectedTab === ProfileScreenTab.Posts) {
                if (!noMorePosts && isMounted) {
                    loading = true;
                    setLoadingMore(true);
                    await loadMorePosts();
                }
            } else if (selectedTab === ProfileScreenTab.CreatorCoin) {
                if (!noMoreHolders && isMounted) {
                    loading = true;
                    setLoadingMore(true);
                    await loadMoreHolders();
                }
            }

            if (loading && isMounted) {
                setProfile(profile);
                configureSections(profile, selectedTab);
                setLoadingMore(false);
            }
        } catch { return; }
    }

    async function loadMorePosts(): Promise<void> {
        if (profile.Posts?.length > 0) {
            const lastPostHashHex = profile.Posts[profile.Posts.length - 1].PostHashHex;
            const response = await api.getProfilePostsBatch(globals.user.publicKey, username, 10, lastPostHashHex);

            let newPosts = response.Posts as Post[] ?? [];
            if (newPosts?.length > 0) {
                for (const post of newPosts) {
                    post.ProfileEntryResponse = getProfileCopy(profile);
                }
                newPosts = newPosts.filter(post => !post.IsHidden && post.PostHashHex !== pinnedPostHashHex.current);
                profile.Posts = profile.Posts.concat(newPosts);
            } else {
                if (isMounted) {
                    setNoMorePosts(true);
                }
            }
        }
    }

    async function loadMoreHolders(): Promise<void> {
        if (profile.UsersThatHODL && profile.UsersThatHODL.length > 0) {
            const lastPublicKey = profile.UsersThatHODL[profile.UsersThatHODL?.length - 1].HODLerPublicKeyBase58Check;
            const response = await api.getProfileHolders(username, 30, lastPublicKey);
            const holders = response.Hodlers as CreatorCoinHODLer[] ?? [];

            if (holders?.length > 0) {
                profile.UsersThatHODL = profile.UsersThatHODL.concat(holders);
            } else {
                if (isMounted) {
                    setNoMoreHolders(true);
                }
            }
        }
    }

    function getProfileCopy(profile: Profile): Profile {
        const newProfile: Profile = {
            ProfilePic: profile.ProfilePic,
            Username: profile.Username,
            Description: profile.Description,
            PublicKeyBase58Check: profile.PublicKeyBase58Check,
            CoinPriceDeSoNanos: profile.CoinPriceDeSoNanos,
            CoinEntry: profile.CoinEntry,
            IsVerified: profile.IsVerified,
            Posts: []
        };

        return newProfile;
    }

    const keyExtractor = (item: Post | CreatorCoinHODLer | DiamondSender, index: number) => {
        if (selectedTab === ProfileScreenTab.Posts) {
            return (item as Post)?.PostHashHex + index.toString();
        } else if (selectedTab === ProfileScreenTab.CreatorCoin) {
            return (item as CreatorCoinHODLer)?.HODLerPublicKeyBase58Check + index.toString();
        } else if (selectedTab === ProfileScreenTab.Diamonds) {
            return (item as DiamondSender)?.SenderPublicKeyBase58Check + index.toString();
        } else {
            return index.toString();
        }
    };

    const renderItem = () => <View style={styles.profileCardContainer}>
        {
            !globals.readonly &&
                !isLoggedInUser ?
                <ProfileScreenOptionsComponent
                    publicKey={profile.PublicKeyBase58Check}
                    goToChat={goToChat}
                    username={profile.Username}
                />
                :
                <OwnProfileOptionsComponent
                    username={profile.Username}
                    publicKey={profile.PublicKeyBase58Check}
                    navigation={navigation} />
        }
        <ProfileCard
            navigation={navigation}
            profile={profile}
            coinPrice={coinPrice}
        />
    </View>;

    const renderHeader = (profileCard: JSX.Element) => profileCard ?
        <View /> :
        <TabsComponent
            tabs={tabs}
            selectedTab={selectedTab}
            onTabClick={onTabClick}
        />;

    const renderFooter = () => isLoadingMore ?
        <ActivityIndicator color={themeStyles.fontColorMain.color} />
        : <View />;

    const renderRefresh = <RefreshControl
        tintColor={themeStyles.fontColorMain.color}
        titleColor={themeStyles.fontColorMain.color}
        refreshing={false}
        onRefresh={loadData} />;

    return isLoading ?
        <CloutFeedLoader />
        :
        canCreateProfile ?
            <View style={styles.container}>
                <SectionList
                    ref={sectionListRef}
                    onScrollToIndexFailed={() => { return; }}
                    style={themeStyles.containerColorSub}
                    stickySectionHeadersEnabled={true}
                    initialNumToRender={3}
                    sections={sections}
                    keyExtractor={keyExtractor}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={3}
                    maxToRenderPerBatch={selectedTab === ProfileScreenTab.Posts ? 5 : 20}
                    windowSize={selectedTab === ProfileScreenTab.Posts ? 8 : 20}
                    renderItem={renderItem}
                    renderSectionHeader={({ section: { profileCard } }) => renderHeader(profileCard)}
                    refreshControl={renderRefresh}
                    ListFooterComponent={renderFooter}
                />
            </View>
            :
            <ProfileNotCompletedComponent />;
}

const styles = StyleSheet.create(
    {
        container: {
            flex: 1
        },
        profileCardContainer: {
            marginHorizontal: 10,
            marginTop: 10,
            marginBottom: 8
        },
        noPostsContainer: {
            paddingLeft: 10,
            paddingTop: 10
        },
        noPostsText: {
            fontWeight: '500'
        },
        activityIndicator: {
            marginTop: 100
        }
    }
);
