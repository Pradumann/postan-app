import React from 'react';
import { PostComponent } from '@components/post/post.component';
import { ParamListBase, RouteProp } from '@react-navigation/native';
import { themeStyles } from '@styles/globalColors';
import { ActivityIndicator, FlatList, RefreshControl, View, StyleSheet, Text } from 'react-native';
import { EventType, Post, UnsavePostEvent } from '@types';
import { cache } from '@services/dataCaching';
import { api } from '@services';
import { globals } from '@globals/globals';
import { eventManager } from '@globals/injector';
import CloutFeedLoader from '@components/loader/cloutFeedLoader.component';
import { StackNavigationProp } from '@react-navigation/stack';

interface Props {
    navigation: StackNavigationProp<ParamListBase>
    route: RouteProp<ParamListBase, 'Home'>;
}

interface State {
    isLoading: boolean;
    posts: Post[];
    isRefreshing: boolean;
    isLoadingMore: boolean;
}

export class SavedPostsScreen extends React.Component<Props, State> {

    private _noMoreData = false;

    private _postHashHexes: string[] = [];

    private _isMounted = false;

    private _unsavePostSubscription: () => void = () => undefined;

    constructor(props: Props) {
        super(props);

        this.state = {
            isLoading: true,
            posts: [],
            isRefreshing: false,
            isLoadingMore: false,
        };

        this.loadData();

        this.loadData = this.loadData.bind(this);
        this.subscribeUnsavePostEvent();
    }

    componentDidMount() {
        this._isMounted = true;
    }

    componentWillUnmount() {
        this._isMounted = false;
        this._unsavePostSubscription();
    }

    subscribeUnsavePostEvent() {
        this._unsavePostSubscription = eventManager.addEventListener(
            EventType.UnsavePost,
            (event: UnsavePostEvent) => {
                if (event?.post && this.state.posts?.length > 0) {
                    const filteredPosts = this.state.posts.filter(post => post.PostHashHex !== event.post.PostHashHex);
                    if (this._isMounted) {
                        this.setState({ posts: filteredPosts });
                    }
                }
            }
        );
    }

    async loadData() {
        try {
            this._noMoreData = false;

            if (this._isMounted) {
                this.setState({ posts: [], isLoading: true });
            }
            const savedPosts = await cache.savedPosts.reloadData();
            this._postHashHexes = Object.keys(savedPosts).filter(p_key => savedPosts[p_key]);
            this.loadPosts(false);
        } catch {
            return;
        }
    }

    async loadPosts(loadMore: boolean) {
        if (this.state.isLoadingMore || this._noMoreData) {
            return;
        }
        if (this._isMounted) {
            this.setState({ isLoading: !loadMore, isLoadingMore: loadMore });
        }

        try {
            const batchSize = 8;
            const startIndex = this.state.posts.length;
            const postsBatch = this._postHashHexes.slice(startIndex, startIndex + batchSize);

            if (postsBatch.length < batchSize) {
                this._noMoreData = true;
            }

            let allPosts = this.state.posts;
            if (postsBatch?.length > 0) {
                const posts = await this.fetchPosts(postsBatch);
                const filteredPosts = await this.processPosts(posts);
                allPosts = allPosts.concat(filteredPosts);
                if (this._isMounted) {
                    this.setState({ posts: allPosts });
                }
            }

        } catch {
            undefined;
        } finally {
            if (this._isMounted) {
                this.setState({ isLoading: false, isLoadingMore: false, isRefreshing: false });
            }
        }
    }

    async fetchPosts(postHashHexes: string[]): Promise<Post[]> {
        const promises: Promise<Post | undefined>[] = [];

        for (const postHashHex of postHashHexes) {
            const promise = new Promise<Post | undefined>(
                (p_resolve) => {
                    api.getSinglePost(globals.user.publicKey, postHashHex, false, 0, 0).then(
                        (response: any) => {
                            p_resolve(response.PostFound);
                        }
                    ).catch(() => p_resolve(undefined));
                }
            );
            promises.push(promise);
        }

        const posts = await Promise.all(promises);
        const filteredPosts: Post[] = posts.filter(post => post != null) as Post[];

        return filteredPosts;
    }

    async processPosts(posts: Post[]): Promise<Post[]> {
        let filteredPosts: Post[] = [];

        if (posts) {
            const user = await cache.user.getData();
            const blockedUsers = user?.BlockedPubKeys ? user.BlockedPubKeys : [];
            filteredPosts = posts.filter(
                p_post => !!p_post.ProfileEntryResponse &&
                    !p_post.IsHidden &&
                    !blockedUsers[p_post.ProfileEntryResponse.PublicKeyBase58Check] &&
                    !blockedUsers[p_post.RepostedPostEntryResponse?.ProfileEntryResponse?.PublicKeyBase58Check]
            );
        }
        return filteredPosts;
    }

    render(): JSX.Element {

        if (this.state.isLoading) {
            return <CloutFeedLoader />;
        }

        if (this.state.posts.length === 0) {
            return <View style={[styles.emptyTextContainer, themeStyles.containerColorMain]}>
                <Text style={[themeStyles.fontColorMain, styles.emptyText]}>Your list is empty</Text>
            </View>;
        }

        const keyExtractor = (item: Post, index: number) => item.PostHashHex + String(index);
        const renderItem = ({ item }: { item: Post }) => <PostComponent
            route={this.props.route}
            navigation={this.props.navigation}
            post={item} />;

        return (
            <View style={[{ flex: 1 }, themeStyles.containerColorMain]}>
                <FlatList
                    initialNumToRender={3}
                    data={this.state.posts}
                    showsVerticalScrollIndicator={true}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    onEndReached={() => this.loadPosts(true)}
                    onEndReachedThreshold={3}
                    maxToRenderPerBatch={5}
                    windowSize={8}
                    refreshControl={<RefreshControl
                        tintColor={themeStyles.fontColorMain.color}
                        titleColor={themeStyles.fontColorMain.color}
                        refreshing={this.state.isRefreshing}
                        onRefresh={() => this.loadData()} />
                    }
                    ListFooterComponent={this.state.isLoadingMore && !this.state.isLoading ? <ActivityIndicator color={themeStyles.fontColorMain.color} /> : undefined}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create(
    {
        emptyTextContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center'
        },
        emptyText: {
            fontSize: 16,
        }
    }
);
