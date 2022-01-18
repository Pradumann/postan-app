import { SelectListControl } from '@controls/selectList.control';
import { themeStyles } from '@styles/globalColors';
import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { HotFeedFilter } from '@types';

interface Props {
    filter: HotFeedFilter;
    onSettingsChange: (p_filter: HotFeedFilter) => void;
    isFilterShown: boolean;
}

interface State {
    filter: HotFeedFilter;
}

export class HotFeedSettingsComponent extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);

        this.state = {
            filter: this.props.filter
        };

        this.onFilterValueChange = this.onFilterValueChange.bind(this);
        this.onDone = this.onDone.bind(this);
    }

    onFilterValueChange(p_value: HotFeedFilter): void {
        this.setState({ filter: p_value });
    }

    onDone(): void {
        this.props.onSettingsChange(this.state.filter);
    }

    render(): JSX.Element {
        return <Modal
            animationIn={'slideInUp'}
            animationOutTiming={500}
            swipeDirection={'down'}
            onSwipeComplete={() => this.onDone()}
            onBackdropPress={() => this.onDone()}
            onBackButtonPress={() => this.onDone()}
            isVisible={this.props.isFilterShown}
            propagateSwipe={true}
            style={[styles.modal]}>
            <ScrollView style={[styles.container, themeStyles.modalBackgroundColor]} bounces={false}>
                <View style={[styles.headerContainer, themeStyles.recloutBorderColor]}>
                    <Text style={[styles.showText, themeStyles.fontColorMain]}>Time Period</Text>
                </View>
                <SelectListControl
                    style={[styles.selectList]}
                    options={[
                        {
                            name: 'Today',
                            value: HotFeedFilter.Today
                        },
                        {
                            name: 'Last Week',
                            value: HotFeedFilter.Week
                        }
                    ]}
                    value={this.state.filter}
                    onValueChange={(value: string | string[]) => this.onFilterValueChange(value as HotFeedFilter)}
                >
                </SelectListControl>
            </ScrollView>
        </Modal>;
    }
}

const styles = StyleSheet.create(
    {
        modal: {
            width: '100%',
            marginLeft: 0,
            marginBottom: 0
        },
        container: {
            height: '75%',
            maxHeight: 400,
            marginTop: 'auto',
            borderTopRightRadius: 20,
            borderTopLeftRadius: 20,
            paddingTop: 30
        },
        headerContainer: {
            borderBottomWidth: 1,
            width: '100%',
            alignItems: 'center',
            paddingBottom: 5
        },
        showText: {
            fontSize: 16,
            fontWeight: '700'
        },
        selectList: {
            width: '100%'
        }
    }
);
