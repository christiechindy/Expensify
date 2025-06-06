import Onyx from 'react-native-onyx';
import {buildNextStep} from '@libs/NextStepUtils';
import {buildOptimisticEmptyReport, buildOptimisticExpenseReport} from '@libs/ReportUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Policy, Report, ReportNextStep} from '@src/types/onyx';
import {toCollectionDataSet} from '@src/types/utils/CollectionDataSet';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

Onyx.init({keys: ONYXKEYS});

describe('libs/NextStepUtils', () => {
    describe('buildNextStep', () => {
        const currentUserEmail = 'current-user@expensify.com';
        const currentUserAccountID = 37;
        const strangeEmail = 'stranger@expensify.com';
        const strangeAccountID = 50;
        const ownerEmail = 'owner@expensify.com';
        const ownerAccountID = 99;
        const policyID = '1';
        const policy: Policy = {
            // Important props
            id: policyID,
            owner: ownerEmail,
            harvesting: {
                enabled: false,
            },
            // Required props
            name: 'Policy',
            role: 'admin',
            type: 'team',
            outputCurrency: CONST.CURRENCY.USD,
            isPolicyExpenseChatEnabled: true,
            reimbursementChoice: CONST.POLICY.REIMBURSEMENT_CHOICES.REIMBURSEMENT_YES,
        };
        const optimisticNextStep: ReportNextStep = {
            type: 'neutral',
            icon: CONST.NEXT_STEP.ICONS.HOURGLASS,
            message: [],
        };
        const report = buildOptimisticExpenseReport('fake-chat-report-id-1', policyID, 1, -500, CONST.CURRENCY.USD) as Report;

        beforeAll(() => {
            const policyCollectionDataSet = toCollectionDataSet(ONYXKEYS.COLLECTION.POLICY, [policy], (item) => item.id);

            Onyx.multiSet({
                [ONYXKEYS.SESSION]: {email: currentUserEmail, accountID: currentUserAccountID},
                [ONYXKEYS.PERSONAL_DETAILS_LIST]: {
                    [strangeAccountID]: {
                        accountID: strangeAccountID,
                        login: strangeEmail,
                        avatar: '',
                    },
                    [currentUserAccountID]: {
                        accountID: currentUserAccountID,
                        login: currentUserEmail,
                        avatar: '',
                    },
                    [ownerAccountID]: {
                        accountID: ownerAccountID,
                        login: ownerEmail,
                        avatar: '',
                    },
                },
                ...policyCollectionDataSet,
            }).then(waitForBatchedUpdates);
        });

        beforeEach(() => {
            report.ownerAccountID = currentUserAccountID;
            report.managerID = currentUserAccountID;
            optimisticNextStep.icon = CONST.NEXT_STEP.ICONS.HOURGLASS;
            optimisticNextStep.message = [];

            Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, policy).then(waitForBatchedUpdates);
        });

        describe('it generates and optimistic nextStep once a report has been created', () => {
            test('Correct next steps message', () => {
                const emptyReport = buildOptimisticEmptyReport(
                    'fake-empty-report-id-2',
                    currentUserAccountID,
                    {reportID: 'fake-parent-report-id-3'},
                    'fake-parent-report-action-id-4',
                    policy,
                    '2025-03-31 13:23:11',
                );

                optimisticNextStep.message = [
                    {
                        text: 'Waiting for ',
                    },
                    {
                        text: `${currentUserEmail}`,
                        type: 'strong',
                    },
                    {
                        text: ' to ',
                    },
                    {
                        text: 'add',
                    },
                    {
                        text: ' %expenses.',
                    },
                ];

                const result = buildNextStep(emptyReport, CONST.REPORT.STATUS_NUM.OPEN);

                expect(result).toMatchObject(optimisticNextStep);
            });
        });

        describe('it generates an optimistic nextStep once a report has been opened', () => {
            test('Fix violations', () => {
                optimisticNextStep.icon = CONST.NEXT_STEP.ICONS.HOURGLASS;

                optimisticNextStep.message = [
                    {
                        text: 'Waiting for ',
                    },
                    {
                        text: `${currentUserEmail}`,
                        type: 'strong',
                    },
                    {
                        text: ' to ',
                    },
                    {
                        text: 'fix the issue(s)',
                    },
                ];

                const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.OPEN, true);

                expect(result).toMatchObject(optimisticNextStep);
            });

            test('self review', () => {
                optimisticNextStep.icon = CONST.NEXT_STEP.ICONS.HOURGLASS;

                // Waiting for userSubmitter to add expense(s).
                optimisticNextStep.message = [
                    {
                        text: 'Waiting for ',
                    },
                    {
                        text: `${currentUserEmail}`,
                        type: 'strong',
                    },
                    {
                        text: ' to ',
                    },
                    {
                        text: 'add',
                    },
                    {
                        text: ' %expenses.',
                    },
                ];

                const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.OPEN);

                expect(result).toMatchObject(optimisticNextStep);
            });

            describe('scheduled submit enabled', () => {
                beforeEach(() => {
                    optimisticNextStep.icon = CONST.NEXT_STEP.ICONS.HOURGLASS;
                });

                // Format: Waiting for userSubmitter's expense(s) to automatically submit on scheduledSubmitSettings

                test('daily', () => {
                    // Waiting for userSubmitter's expense(s) to automatically submit later today
                    optimisticNextStep.message = [
                        {
                            text: 'Waiting for ',
                        },
                        {
                            text: `${currentUserEmail}`,
                            clickToCopyText: `${currentUserEmail}`,
                            type: 'strong',
                        },
                        {
                            text: "'s",
                            type: 'strong',
                        },
                        {
                            text: ' %expenses to automatically submit',
                        },
                        {
                            text: ' later today',
                        },
                    ];

                    return Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                        autoReportingFrequency: CONST.POLICY.AUTO_REPORTING_FREQUENCIES.IMMEDIATE,
                        harvesting: {
                            enabled: true,
                        },
                    }).then(() => {
                        const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.OPEN);

                        expect(result).toMatchObject(optimisticNextStep);
                    });
                });

                test('weekly', () => {
                    // Waiting for userSubmitter's expense(s) to automatically submit on Sunday
                    optimisticNextStep.message = [
                        {
                            text: 'Waiting for ',
                        },
                        {
                            text: `${currentUserEmail}`,
                            clickToCopyText: `${currentUserEmail}`,
                            type: 'strong',
                        },
                        {
                            text: "'s",
                            type: 'strong',
                        },
                        {
                            text: ' %expenses to automatically submit',
                        },
                        {
                            text: ' on Sunday',
                        },
                    ];

                    return Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                        autoReportingFrequency: CONST.POLICY.AUTO_REPORTING_FREQUENCIES.WEEKLY,
                        harvesting: {
                            enabled: true,
                        },
                    }).then(() => {
                        const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.OPEN);

                        expect(result).toMatchObject(optimisticNextStep);
                    });
                });

                test('twice a month', () => {
                    // Waiting for userSubmitter's expense(s) to automatically submit on the 1st and 16th of each month
                    optimisticNextStep.message = [
                        {
                            text: 'Waiting for ',
                        },
                        {
                            text: `${currentUserEmail}`,
                            clickToCopyText: `${currentUserEmail}`,
                            type: 'strong',
                        },
                        {
                            text: "'s",
                            type: 'strong',
                        },
                        {
                            text: ' %expenses to automatically submit',
                        },
                        {
                            text: ' on the 1st and 16th of each month',
                        },
                    ];

                    return Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                        autoReportingFrequency: CONST.POLICY.AUTO_REPORTING_FREQUENCIES.SEMI_MONTHLY,
                        harvesting: {
                            enabled: true,
                        },
                    }).then(() => {
                        const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.OPEN);

                        expect(result).toMatchObject(optimisticNextStep);
                    });
                });

                test('monthly on the 2nd', () => {
                    // Waiting for userSubmitter's expense(s) to automatically submit on the 2nd of each month
                    optimisticNextStep.message = [
                        {
                            text: 'Waiting for ',
                        },
                        {
                            text: `${currentUserEmail}`,
                            clickToCopyText: `${currentUserEmail}`,
                            type: 'strong',
                        },
                        {
                            text: "'s",
                            type: 'strong',
                        },
                        {
                            text: ' %expenses to automatically submit',
                        },
                        {
                            text: ' on the 2nd of each month',
                        },
                    ];

                    return Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                        autoReportingFrequency: CONST.POLICY.AUTO_REPORTING_FREQUENCIES.MONTHLY,
                        autoReportingOffset: 2,
                        harvesting: {
                            enabled: true,
                        },
                    }).then(() => {
                        const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.OPEN);

                        expect(result).toMatchObject(optimisticNextStep);
                    });
                });

                test('monthly on the last day', () => {
                    // Waiting for userSubmitter's expense(s) to automatically submit on lastDayOfMonth of each month
                    optimisticNextStep.message = [
                        {
                            text: 'Waiting for ',
                        },
                        {
                            text: `${currentUserEmail}`,
                            clickToCopyText: `${currentUserEmail}`,
                            type: 'strong',
                        },
                        {
                            text: "'s",
                            type: 'strong',
                        },
                        {
                            text: ' %expenses to automatically submit',
                        },
                        {
                            text: ` on the last day of the month`,
                        },
                    ];

                    return Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                        autoReportingFrequency: CONST.POLICY.AUTO_REPORTING_FREQUENCIES.MONTHLY,
                        autoReportingOffset: CONST.POLICY.AUTO_REPORTING_OFFSET.LAST_DAY_OF_MONTH,
                        harvesting: {
                            enabled: true,
                        },
                    }).then(() => {
                        const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.OPEN);
                        expect(result).toMatchObject(optimisticNextStep);
                    });
                });

                test('monthly on the last business day', () => {
                    // Waiting for userSubmitter's expense(s) to automatically submit on lastBusinessDayOfMonth of each month
                    optimisticNextStep.message = [
                        {
                            text: 'Waiting for ',
                        },
                        {
                            text: `${currentUserEmail}`,
                            clickToCopyText: `${currentUserEmail}`,
                            type: 'strong',
                        },
                        {
                            text: "'s",
                            type: 'strong',
                        },
                        {
                            text: ' %expenses to automatically submit',
                        },
                        {
                            text: ` on the last business day of the month`,
                        },
                    ];

                    return Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                        autoReportingFrequency: CONST.POLICY.AUTO_REPORTING_FREQUENCIES.MONTHLY,
                        autoReportingOffset: CONST.POLICY.AUTO_REPORTING_OFFSET.LAST_BUSINESS_DAY_OF_MONTH,
                        harvesting: {
                            enabled: true,
                        },
                    }).then(() => {
                        const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.OPEN);

                        expect(result).toMatchObject(optimisticNextStep);
                    });
                });

                test('trip', () => {
                    // Waiting for userSubmitter's expense(s) to automatically submit at the end of their trip
                    optimisticNextStep.message = [
                        {
                            text: 'Waiting for ',
                        },
                        {
                            text: `${currentUserEmail}`,
                            clickToCopyText: `${currentUserEmail}`,
                            type: 'strong',
                        },
                        {
                            text: "'s",
                            type: 'strong',
                        },
                        {
                            text: ' %expenses to automatically submit',
                        },
                        {
                            text: ` at the end of their trip`,
                        },
                    ];

                    return Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                        autoReportingFrequency: CONST.POLICY.AUTO_REPORTING_FREQUENCIES.TRIP,
                        harvesting: {
                            enabled: true,
                        },
                    }).then(() => {
                        const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.OPEN);

                        expect(result).toMatchObject(optimisticNextStep);
                    });
                });

                test('manual', () => {
                    // Waiting for userSubmitter to submit expense(s).
                    optimisticNextStep.message = [
                        {
                            text: 'Waiting for ',
                        },
                        {
                            text: `${currentUserEmail}`,
                            type: 'strong',
                        },
                        {
                            text: ' to ',
                        },
                        {
                            text: 'submit',
                        },
                        {
                            text: ' %expenses.',
                        },
                    ];

                    return Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                        autoReportingFrequency: CONST.POLICY.AUTO_REPORTING_FREQUENCIES.IMMEDIATE,
                        harvesting: {
                            enabled: false,
                        },
                    }).then(() => {
                        const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.OPEN);

                        expect(result).toMatchObject(optimisticNextStep);
                    });
                });
            });
        });

        describe('it generates an optimistic nextStep once a report has been submitted', () => {
            test('self review', () => {
                optimisticNextStep.icon = CONST.NEXT_STEP.ICONS.HOURGLASS;

                // Waiting for an admin to set up a bank account
                optimisticNextStep.message = [
                    {
                        text: 'Waiting for ',
                    },
                    {
                        text: `an admin`,
                    },
                    {
                        text: ' to ',
                    },
                    {
                        text: 'finish setting up',
                    },
                    {
                        text: ' a business bank account.',
                    },
                ];

                const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.APPROVED);

                expect(result).toMatchObject(optimisticNextStep);
            });

            test('self review with bank account setup', () => {
                optimisticNextStep.icon = CONST.NEXT_STEP.ICONS.HOURGLASS;

                // Waiting for an admin to pay expense(s)
                optimisticNextStep.message = [
                    {
                        text: 'Waiting for ',
                    },
                    {
                        text: `an admin`,
                    },
                    {
                        text: ' to ',
                    },
                    {
                        text: 'pay',
                    },
                    {
                        text: ' %expenses.',
                    },
                ];

                return Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                    achAccount: {
                        accountNumber: '123456789',
                    },
                }).then(() => {
                    const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.APPROVED);

                    expect(result).toMatchObject(optimisticNextStep);

                    // restore to previous state
                    Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                        achAccount: null,
                    });
                });
            });

            test('another reviewer', () => {
                report.managerID = strangeAccountID;
                optimisticNextStep.icon = CONST.NEXT_STEP.ICONS.HOURGLASS;

                // Waiting for userApprover to approve expense(s)
                optimisticNextStep.message = [
                    {
                        text: 'Waiting for ',
                    },
                    {
                        text: strangeEmail,
                        type: 'strong',
                    },
                    {
                        text: ' to ',
                    },
                    {
                        text: 'approve',
                    },
                    {
                        text: ' %expenses.',
                    },
                ];

                return Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                    employeeList: {
                        [currentUserEmail]: {
                            submitsTo: strangeEmail,
                        },
                    },
                }).then(() => {
                    const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.SUBMITTED);

                    expect(result).toMatchObject(optimisticNextStep);
                });
            });

            test('another owner', () => {
                report.ownerAccountID = strangeAccountID;
                optimisticNextStep.icon = CONST.NEXT_STEP.ICONS.HOURGLASS;

                // Waiting for userApprover to approve expense(s)
                optimisticNextStep.message = [
                    {
                        text: 'Waiting for ',
                    },
                    {
                        text: currentUserEmail,
                        type: 'strong',
                    },
                    {
                        text: ' to ',
                    },
                    {
                        text: 'approve',
                    },
                    {
                        text: ' %expenses.',
                    },
                ];

                return Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                    employeeList: {
                        [strangeEmail]: {
                            submitsTo: currentUserEmail,
                        },
                    },
                }).then(() => {
                    const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.SUBMITTED);

                    expect(result).toMatchObject(optimisticNextStep);
                });
            });
            test('submit and close approval mode', () => {
                report.ownerAccountID = strangeAccountID;
                optimisticNextStep.icon = CONST.NEXT_STEP.ICONS.CHECKMARK;
                optimisticNextStep.message = [
                    {
                        text: 'No further action required!',
                    },
                ];

                return Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                    approvalMode: CONST.POLICY.APPROVAL_MODE.OPTIONAL,
                }).then(() => {
                    const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.CLOSED);

                    expect(result).toMatchObject(optimisticNextStep);
                });
            });

            test('approval mode enabled', () => {
                report.managerID = strangeAccountID;
                optimisticNextStep.icon = CONST.NEXT_STEP.ICONS.HOURGLASS;
                optimisticNextStep.message = [
                    {
                        text: 'Waiting for ',
                    },
                    {
                        text: ownerEmail,
                        type: 'strong',
                        clickToCopyText: ownerEmail,
                    },
                    {
                        text: ' to ',
                    },
                    {
                        text: 'approve',
                    },
                    {
                        text: ' %expenses.',
                    },
                ];

                return Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                    approvalMode: CONST.POLICY.APPROVAL_MODE.BASIC,
                }).then(() => {
                    const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.SUBMITTED);

                    expect(result).toMatchObject(optimisticNextStep);
                });
            });

            test('advanced approval mode enabled', () => {
                report.managerID = strangeAccountID;
                optimisticNextStep.icon = CONST.NEXT_STEP.ICONS.HOURGLASS;
                optimisticNextStep.message = [
                    {
                        text: 'Waiting for ',
                    },
                    {
                        text: strangeEmail,
                        type: 'strong',
                        clickToCopyText: strangeEmail,
                    },
                    {
                        text: ' to ',
                    },
                    {
                        text: 'approve',
                    },
                    {
                        text: ' %expenses.',
                    },
                ];

                return Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                    approvalMode: CONST.POLICY.APPROVAL_MODE.ADVANCED,
                }).then(() => {
                    const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.SUBMITTED);
                    expect(result).toMatchObject(optimisticNextStep);
                });
            });
        });

        describe('it generates an optimistic nextStep once a report has been approved', () => {
            test('non-payer', () => {
                report.managerID = strangeAccountID;
                optimisticNextStep.icon = CONST.NEXT_STEP.ICONS.CHECKMARK;
                optimisticNextStep.message = [
                    {
                        text: 'No further action required!',
                    },
                ];

                return Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                    reimbursementChoice: CONST.POLICY.REIMBURSEMENT_CHOICES.REIMBURSEMENT_MANUAL,
                }).then(() => {
                    const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.APPROVED);

                    expect(result).toMatchObject(optimisticNextStep);
                });
            });

            test('payer', () => {
                optimisticNextStep.icon = CONST.NEXT_STEP.ICONS.HOURGLASS;

                // Waiting for an admin to set up a bank account
                optimisticNextStep.message = [
                    {
                        text: 'Waiting for ',
                    },
                    {
                        text: 'an admin',
                    },
                    {
                        text: ' to ',
                    },
                    {
                        text: 'finish setting up',
                    },
                    {
                        text: ' a business bank account.',
                    },
                ];
                // mock the report as approved
                const originalState = {stateNum: report.stateNum, statusNum: report.statusNum};
                report.stateNum = CONST.REPORT.STATE_NUM.APPROVED;
                report.statusNum = CONST.REPORT.STATUS_NUM.APPROVED;

                const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.APPROVED);

                expect(result).toMatchObject(optimisticNextStep);

                // restore
                report.stateNum = originalState.stateNum;
                report.statusNum = originalState.statusNum;
            });

            test('payer with bank account setup', () => {
                optimisticNextStep.icon = CONST.NEXT_STEP.ICONS.HOURGLASS;

                // Waiting for an admin to pay expense(s)
                optimisticNextStep.message = [
                    {
                        text: 'Waiting for ',
                    },
                    {
                        text: 'an admin',
                    },
                    {
                        text: ' to ',
                    },
                    {
                        text: 'pay',
                    },
                    {
                        text: ' %expenses.',
                    },
                ];

                return Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {
                    achAccount: {
                        accountNumber: '123456789',
                    },
                }).then(() => {
                    const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.APPROVED);

                    expect(result).toMatchObject(optimisticNextStep);
                });
            });

            describe('it generates an optimistic nextStep once a report has been paid', () => {
                test('paid with wallet / outside of Expensify', () => {
                    optimisticNextStep.icon = CONST.NEXT_STEP.ICONS.CHECKMARK;
                    optimisticNextStep.message = [
                        {
                            text: 'No further action required!',
                        },
                    ];

                    const result = buildNextStep(report, CONST.REPORT.STATUS_NUM.REIMBURSED);

                    expect(result).toMatchObject(optimisticNextStep);
                });
            });
        });
    });
});
