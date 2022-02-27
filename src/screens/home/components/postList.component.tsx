import React from 'react';
import { FlatList, View, RefreshControl, ActivityIndicator } from 'react-native';
import { PostComponent } from '@components/post/post.component';
import { HiddenNFTType, HomeScreenTab, Post } from '@types';
import { ParamListBase, RouteProp } from '@react-navigation/native';
import { themeStyles } from '@styles/globalColors';
import { globals } from '@globals/globals';
import { api, cloutFeedApi, cache } from '@services';
import { navigatorGlobals } from '@globals/navigatorGlobals';
import CloutFeedLoader from '@components/loader/cloutFeedLoader.component';
import { StackNavigationProp } from '@react-navigation/stack';

type RouteParams = {
    Home: {
        newPost: Post;
        deletedPost: string;
        blockedUser: string;
    }
};

interface Props {
    navigation: StackNavigationProp<ParamListBase>;
    route: RouteProp<RouteParams, 'Home'>;
    selectedTab: HomeScreenTab;
    api: (publicKey: string, count: number, lastPostHashHex: string | undefined) => Promise<any>;
}

interface State {
    posts: Post[];
    isLoading: boolean;
    isLoadingMore: boolean;
    isRefreshing: boolean;
    hiddenNFTOption: HiddenNFTType;
}

export class PostListComponent extends React.Component<Props, State> {

    private _flatListRef: React.RefObject<FlatList>;

    private _postsCountPerLoad = 10;

    private _currentScrollPosition = 0;

    private _noMoreData = false;

    private _isMounted = false;

    constructor(props: Props) {
        super(props);

        this.state = {
            posts: [],
            isLoading: true,
            isLoadingMore: false,
            isRefreshing: false,
            hiddenNFTOption: HiddenNFTType.Details,
        };

        navigatorGlobals.refreshHome = () => {
            if (this._currentScrollPosition > 0 || !this._flatListRef.current) {
                this._flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
            } else {
                this.refresh(false);
            }
        };

        this._flatListRef = React.createRef();
        this.loadPosts = this.loadPosts.bind(this);
        this.processPosts = this.processPosts.bind(this);
        this.getPinnedPost = this.getPinnedPost.bind(this);
        this.refresh = this.refresh.bind(this);

        this.refresh();
    }

    componentDidMount(): void {
        this._isMounted = true;
    }

    componentWillUnmount(): void {
        this._isMounted = false;
    }

    componentDidUpdate(): void {
        if (this.props.route.params?.newPost) {
            const newPostFound = this.state.posts?.find((p_post: Post) => p_post.PostHashHex === this.props.route.params.newPost.PostHashHex);
            if (!newPostFound) {
                const newPosts = [this.props.route.params.newPost].concat(this.state.posts ? this.state.posts : []);
                if (this._isMounted) {
                    this.setState({ posts: newPosts });
                }
            }
            this.props.navigation.setParams({ newPost: undefined });
        }

        if (this.props.route.params?.deletedPost) {
            const posts = this.state.posts?.filter(
                p_post => p_post.PostHashHex !== this.props.route.params.deletedPost
            );
            if (this._isMounted && posts) {
                this.setState({ posts });
            }
            this.props.navigation.setParams({ deletedPost: undefined });
        }

        if (this.props.route.params?.blockedUser) {
            const posts = this.state.posts?.filter(p_post => p_post.ProfileEntryResponse?.PublicKeyBase58Check !== this.props.route.params.blockedUser);
            if (this._isMounted && posts) {
                this.setState({ posts });
            }
            this.props.navigation.setParams({ blockedUser: undefined });
        }
    }

    async refresh(p_showLoading = true): Promise<void> {

        if (this._isMounted && p_showLoading) {
            this.setState({ isLoading: true });
        } else if (this._isMounted) {
            this.setState({ isRefreshing: true });
        }

        this._currentScrollPosition = 0;
        this._noMoreData = false;
        await cache.exchangeRate.getData();
        await this.loadPosts(false);
    }

    private async loadPosts(p_loadMore: boolean) {
        if (this.state.isLoadingMore || this._noMoreData) {
            return;
        }

        if (this._isMounted) {
            this.setState({ isLoadingMore: p_loadMore });
        }

        const post: Post | undefined = !p_loadMore && this.props.selectedTab === HomeScreenTab.Global ? await this.getPinnedPost() : undefined;

        const callback = this.props.api;
        const lastPosHash = this.state.posts?.length > 0 && p_loadMore ? this.state.posts[this.state.posts.length - 1].PostHashHex : undefined;

        try {
            const response = await callback(globals.user.publicKey, this._postsCountPerLoad, lastPosHash);
            let allPosts: Post[] = [];
            const newPosts = response.PostsFound as Post[];

            this._noMoreData = !newPosts || newPosts.length === 0;

            if (post) {
                newPosts?.unshift(post);
            }

            if (p_loadMore) {
                allPosts = this.state.posts?.concat(newPosts);
            } else {
                allPosts = newPosts;
            }

            allPosts = await this.processPosts(allPosts);

            if (this._isMounted) {
                this.setState({ posts: allPosts });
            }

        } catch (p_error: any) {
            globals.defaultHandleError(p_error);
        } finally {
            if (this._isMounted) {
                this.setState({ isLoadingMore: false, isLoading: false, isRefreshing: false });
            }
        }
    }

    private async processPosts(p_posts: Post[]): Promise<Post[]> {
        let posts: Post[] = [];

        if (posts) {
            const user = await cache.user.getData();
            const blockedUsers = user?.BlockedPubKeys ? user.BlockedPubKeys : [];
            posts = p_posts.filter(
                p_post => !!p_post.ProfileEntryResponse &&
                    !p_post.IsHidden &&
                    !blockedUsers[p_post.ProfileEntryResponse.PublicKeyBase58Check] &&
                    !blockedUsers[p_post.RepostedPostEntryResponse?.ProfileEntryResponse?.PublicKeyBase58Check]
            );
        }
        return posts;
    }

    private async getPinnedPost(): Promise<Post | undefined> {
        let post: Post | undefined = undefined;

        try {
            const response = await cloutFeedApi.getPinnedPost();
            const pinnedPost = response.pinnedPost;
            if (pinnedPost) {
                const postResponse = await api.getSinglePost(globals.user.publicKey, pinnedPost, false, 0, 0);
                post = postResponse?.PostFound as Post;
            }

        } catch { }

        return post;
    }

    render(): JSX.Element {

        if (this.state.isLoading) {
            return <CloutFeedLoader />;
        }

        const keyExtractor = (item: Post, index: number): string => item.PostHashHex + String(index);
        const renderItem = (item: Post): JSX.Element => <PostComponent
            route={this.props.route}
            navigation={this.props.navigation}
            post={item}
        />;

        const renderFooter = this.state.isLoadingMore && !this.state.isLoading
            ? <ActivityIndicator color={themeStyles.fontColorMain.color} />
            : undefined;

        const refreshControl = <RefreshControl
            tintColor={themeStyles.fontColorMain.color}
            titleColor={themeStyles.fontColorMain.color}
            refreshing={this.state.isRefreshing}
            onRefresh={() => this.refresh(false)}
        />;

        return (
            <View style={{ flex: 1}}>
                <FlatList
                    ref={this._flatListRef}
                    onMomentumScrollEnd={
                        (p_event: any) => this._currentScrollPosition = p_event.nativeEvent.contentOffset.y}
                    data={this.state.posts}
                    showsVerticalScrollIndicator={false}
                    keyExtractor={keyExtractor}
                    renderItem={({ item }) => renderItem(item)}
                    onEndReached={() => this.loadPosts(true)}
                    initialNumToRender={3}
                    onEndReachedThreshold={3}
                    maxToRenderPerBatch={5}
                    windowSize={8}
                    refreshControl={refreshControl}
                    ListFooterComponent={renderFooter}
                />
            </View>
        );
    }
}
