import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Alert } from 'react-native';
import { CloutCastAction, CloutCastPromotion } from '@types';
import { themeStyles } from '@styles/globalColors';
import { calculateAndFormatDeSoInUsd } from '@services/deSoCalculator';
import { globals } from '@globals/globals';
import { signing } from '@services/authorization/signing';
import { cloutCastApi } from '@services';
import { Entypo } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { ParamListBase, RouteProp } from '@react-navigation/native';

interface Props {
    navigation: StackNavigationProp<ParamListBase>;
    route: RouteProp<ParamListBase, string>;
    promotion: CloutCastPromotion;
}

interface State {
    working: boolean;
}

export class CloutCastPostActionsComponent extends React.Component<Props, State> {

    private _isMounted = false;

    constructor(props: Props) {
        super(props);

        this.state = {
            working: false
        };

        this.onActionClick = this.onActionClick.bind(this);
        this.onVerifyClick = this.onVerifyClick.bind(this);
    }

    componentDidMount(): void {
        this._isMounted = true;
    }

    componentWillUnmount(): void {
        this._isMounted = false;
    }

    shouldComponentUpdate(p_nextProps: Props, p_nextState: State): boolean {
        return p_nextProps.promotion?.id !== this.props.promotion?.id ||
            p_nextState.working !== this.state.working;
    }

    private onActionClick() {
        if (this.state.working) {
            return;
        }

        if (!this.props.promotion.requirementsMet) {
            Alert.alert('Sorry', 'You don\'t meet the requirements to promote this post.');
            return;
        }

        switch (this.props.promotion.target.action) {
            case CloutCastAction.ReClout:
            case CloutCastAction.Quote:
                this.goToReclout();
                break;
            case CloutCastAction.Comment:
                this.goToReply();
                break;
        }
    }

    private goToReply() {
        this.props.navigation.navigate(
            'CreatePost',
            {
                parentPost: this.props.promotion.post,
                comment: true
            }
        );
    }

    private goToReclout() {
        this.props.navigation.navigate(
            'CreatePost',
            {
                recloutedPost: this.props.promotion.post,
                reclout: true
            }
        );
    }

    private async onVerifyClick(): Promise<void> {
        if (this.state.working) {
            return;
        }

        this.setState({ working: true });

        try {
            const jwt = await signing.signJWT();
            await cloutCastApi.proofOfWork(this.props.promotion.id, globals.user.publicKey, jwt, globals.cloutCastToken);
            this.props.promotion.alreadyPromoted = true;
            const rate = this.props.promotion.header.rate;
            const formattedRate = calculateAndFormatDeSoInUsd(rate);

            Alert.alert('Verification Success', `The amount $${formattedRate} was transferred to your CloutCast wallet.`);
        } catch (p_exception: any) {
            let errorMessage = 'Something went wrong';

            const error = p_exception.json;
            if (error?.error?.reasons?.length > 0) {
                errorMessage = error.error.reasons[0];
            } else if (error?.error?.message?.length > 0) {
                errorMessage = error?.error?.message;
            }

            Alert.alert('Verification Failure', errorMessage);
        } finally {
            if (this._isMounted) {
                this.setState({ working: false });
            }
        }
    }

    render(): JSX.Element {
        if (!this.props.promotion.requirementsMet) {
            return <View style={[styles.requirementsNotMetContainer, themeStyles.modalBackgroundColor]}>
                <Entypo style={{ marginRight: 4 }} name="emoji-sad" size={18} color={themeStyles.fontColorSub.color} />
                <Text style={[styles.actionText, themeStyles.fontColorMain]}>Requirements not met</Text>
            </View>;
        }

        if (this.props.promotion.alreadyPromoted) {
            return <View style={[styles.requirementsNotMetContainer, themeStyles.modalBackgroundColor]}>
                <Entypo style={{ marginRight: 4 }} name="emoji-happy" size={18} color={themeStyles.fontColorSub.color} />
                <Text style={[styles.actionText, themeStyles.fontColorMain]}>Already promoted</Text>
            </View>;
        }

        const action = this.props.promotion.target.action;

        const rate = this.props.promotion.header.rate;
        const formattedRate = calculateAndFormatDeSoInUsd(rate);

        return <View style={styles.container}>
            <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: this.state.working ? '#8db5a7' : '#029c63' }]}
                activeOpacity={0.7}
                onPress={() => this.onActionClick()}
            >
                <Text style={[styles.actionText, themeStyles.fontColorMain]}>{action} for ~${formattedRate}</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: this.state.working ? '#8db5a7' : '#029c63' }]}
                activeOpacity={0.7}
                onPress={() => this.onVerifyClick()}
            >
                <Text style={[styles.actionText, themeStyles.fontColorMain]}>Verify</Text>
            </TouchableOpacity>
        </View>;
    }
}

const styles = StyleSheet.create(
    {
        container: {
            flexDirection: 'row'
        },
        actionButton: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 10,
            flex: 1,
            marginHorizontal: 10,
            borderRadius: 4
        },
        actionText: {
            fontWeight: '600',
        },
        requirementsNotMetContainer: {
            padding: 10,
            marginHorizontal: 10,
            borderRadius: 4,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center'
        }
    }
);
