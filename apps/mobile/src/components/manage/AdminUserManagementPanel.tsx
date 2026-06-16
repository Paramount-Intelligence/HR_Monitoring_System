import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  forceUserPasswordReset,
  getDepartments,
  getShifts,
  getUserAdminSummary,
  getUserAuditLogs,
  getUserPermissionsDetail,
  resendUserInvitation,
  sendUserPasswordReset,
  updateUserAdminProfile,
  updateUserDepartmentDetails,
  updateUserPermissions,
  updateUserRole,
  updateUserStatus,
} from '../../api/admin-users.api';
import { getUsers } from '../../api/users.api';
import { getErrorMessage, isForbiddenError } from '../../api/client';
import { queryKeys } from '../../constants/query-keys';
import {
  ADMIN_USER_TABS,
  USER_ROLE_OPTIONS,
  USER_STATUS_OPTIONS,
  type AdminUserTabKey,
} from '../../types/admin-user';
import type { User } from '../../types/user';
import { FilterChips } from '../ui/FilterChips';
import { AppButton } from '../ui/AppButton';
import { StatusBadge } from '../ui/StatusBadge';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { UserDetailCard } from './UserDetailCard';
import { colors, radius, spacing, typography } from '../../theme';
import { formatDateTime, safeText } from '../../utils/format';

interface AdminUserManagementPanelProps {
  user: User;
  readOnly?: boolean;
}

function FieldBlock({
  label,
  value,
  onChangeText,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={[typography.labelSm, styles.fieldLabel]}>{label}</Text>
      {editable && onChangeText ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          placeholderTextColor={colors.muted}
        />
      ) : (
        <Text style={[typography.bodyMd, styles.fieldValue]}>{value || '—'}</Text>
      )}
    </View>
  );
}

export function AdminUserManagementPanel({ user, readOnly = false }: AdminUserManagementPanelProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AdminUserTabKey>('profile');
  const [fullName, setFullName] = useState(user.full_name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [designation, setDesignation] = useState(user.designation ?? '');
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [departmentId, setDepartmentId] = useState(user.department_id ?? '');
  const [shiftId, setShiftId] = useState(user.shift_id ?? '');
  const [managerId, setManagerId] = useState(user.manager_id ?? '');
  const [extraGrants, setExtraGrants] = useState<string[]>([]);
  const [extraDenies, setExtraDenies] = useState<string[]>([]);

  useEffect(() => {
    setFullName(user.full_name);
    setEmail(user.email);
    setPhone(user.phone ?? '');
    setDesignation(user.designation ?? '');
    setRole(user.role);
    setStatus(user.status);
    setDepartmentId(user.department_id ?? '');
    setShiftId(user.shift_id ?? '');
    setManagerId(user.manager_id ?? '');
  }, [user]);

  const permissionsQuery = useQuery({
    queryKey: ['users', user.id, 'permissions'],
    queryFn: () => getUserPermissionsDetail(user.id),
    enabled: tab === 'permissions' && !readOnly,
  });

  const summaryQuery = useQuery({
    queryKey: ['users', user.id, 'admin-summary'],
    queryFn: () => getUserAdminSummary(user.id),
    enabled: tab === 'activity',
  });

  const auditQuery = useQuery({
    queryKey: ['users', user.id, 'audit-logs'],
    queryFn: () => getUserAuditLogs(user.id),
    enabled: tab === 'audit',
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    enabled: tab === 'department' && !readOnly,
  });

  const shiftsQuery = useQuery({
    queryKey: ['shifts'],
    queryFn: () => getShifts(true),
    enabled: tab === 'department' && !readOnly,
  });

  const managersQuery = useQuery({
    queryKey: queryKeys.users({ scope: 'managers' }),
    queryFn: () => getUsers({ status: 'active' }),
    enabled: tab === 'department' && !readOnly,
  });

  useEffect(() => {
    if (permissionsQuery.data) {
      setExtraGrants(permissionsQuery.data.extra_permissions.map((item) => item.key));
      setExtraDenies(permissionsQuery.data.denied_permissions.map((item) => item.key));
    }
  }, [permissionsQuery.data]);

  const invalidateUser = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.userDetail(user.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.users({ scope: 'directory' }) });
  };

  const profileMutation = useMutation({
    mutationFn: () =>
      updateUserAdminProfile(user.id, {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        designation: designation.trim() || undefined,
      }),
    onSuccess: () => {
      Alert.alert('Saved', 'Profile updated.');
      invalidateUser();
    },
    onError: (error) => Alert.alert('Update failed', getErrorMessage(error)),
  });

  const accessMutation = useMutation({
    mutationFn: async () => {
      if (role !== user.role) await updateUserRole(user.id, role);
      if (status !== user.status) await updateUserStatus(user.id, status);
    },
    onSuccess: () => {
      Alert.alert('Saved', 'Access settings updated.');
      invalidateUser();
    },
    onError: (error) => Alert.alert('Update failed', getErrorMessage(error)),
  });

  const departmentMutation = useMutation({
    mutationFn: () =>
      updateUserDepartmentDetails(user.id, {
        department_id: departmentId || null,
        shift_id: shiftId || null,
        manager_id: managerId || null,
        designation: designation.trim() || null,
      }),
    onSuccess: () => {
      Alert.alert('Saved', 'Department details updated.');
      invalidateUser();
    },
    onError: (error) => Alert.alert('Update failed', getErrorMessage(error)),
  });

  const permissionsMutation = useMutation({
    mutationFn: () => updateUserPermissions(user.id, { extra_grants: extraGrants, extra_denies: extraDenies }),
    onSuccess: () => {
      Alert.alert('Saved', 'Permissions updated.');
      void permissionsQuery.refetch();
    },
    onError: (error) => Alert.alert('Update failed', getErrorMessage(error)),
  });

  const securityMutation = useMutation({
    mutationFn: (action: 'reset' | 'force' | 'invite') => {
      if (action === 'reset') return sendUserPasswordReset(user.id);
      if (action === 'force') return forceUserPasswordReset(user.id);
      return resendUserInvitation(user.id);
    },
    onSuccess: (result) => Alert.alert('Security action', result.message),
    onError: (error) => Alert.alert('Action failed', getErrorMessage(error)),
  });

  const managerOptions = useMemo(
    () => (managersQuery.data ?? []).filter((item) => item.id !== user.id),
    [managersQuery.data, user.id]
  );

  const permissionItems = permissionsQuery.data?.role_permissions ?? [];

  return (
    <View style={styles.wrap}>
      <UserDetailCard user={user} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        <FilterChips
          options={ADMIN_USER_TABS.map((item) => ({ id: item.id, label: item.label }))}
          selectedId={tab}
          onSelect={(id) => setTab(id as AdminUserTabKey)}
        />
      </ScrollView>

      {tab === 'profile' ? (
        <View style={styles.panel}>
          <FieldBlock label="Full name" value={fullName} onChangeText={setFullName} editable={!readOnly} />
          <FieldBlock label="Email" value={email} onChangeText={setEmail} editable={!readOnly} />
          <FieldBlock label="Phone" value={phone} onChangeText={setPhone} editable={!readOnly} />
          <FieldBlock label="Designation" value={designation} onChangeText={setDesignation} editable={!readOnly} />
          {!readOnly ? (
            <AppButton title="Save profile" loading={profileMutation.isPending} onPress={() => profileMutation.mutate()} />
          ) : null}
        </View>
      ) : null}

      {tab === 'access' ? (
        <View style={styles.panel}>
          <Text style={[typography.labelSm, styles.fieldLabel]}>Role</Text>
          <FilterChips options={USER_ROLE_OPTIONS} selectedId={role} onSelect={readOnly ? () => undefined : setRole} />
          <Text style={[typography.labelSm, styles.fieldLabel]}>Status</Text>
          <FilterChips options={USER_STATUS_OPTIONS} selectedId={status} onSelect={readOnly ? () => undefined : setStatus} />
          {!readOnly ? (
            <AppButton title="Save access" loading={accessMutation.isPending} onPress={() => accessMutation.mutate()} />
          ) : null}
        </View>
      ) : null}

      {tab === 'department' ? (
        <View style={styles.panel}>
          <Text style={[typography.labelSm, styles.fieldLabel]}>Department</Text>
          <FilterChips
            options={[{ id: '', label: 'None' }, ...(departmentsQuery.data ?? []).map((dept) => ({ id: dept.id, label: dept.name }))]}
            selectedId={departmentId}
            onSelect={readOnly ? () => undefined : setDepartmentId}
          />
          <Text style={[typography.labelSm, styles.fieldLabel]}>Shift</Text>
          <FilterChips
            options={[{ id: '', label: 'None' }, ...(shiftsQuery.data ?? []).map((shift) => ({ id: shift.id, label: shift.name }))]}
            selectedId={shiftId}
            onSelect={readOnly ? () => undefined : setShiftId}
          />
          <Text style={[typography.labelSm, styles.fieldLabel]}>Reporting manager</Text>
          <FilterChips
            options={[
              { id: '', label: 'None' },
              ...managerOptions.slice(0, 12).map((mgr) => ({
                id: mgr.id,
                label: mgr.full_name.split(' ')[0] ?? mgr.full_name,
              })),
            ]}
            selectedId={managerId}
            onSelect={readOnly ? () => undefined : setManagerId}
          />
          {!readOnly ? (
            <AppButton title="Save department" loading={departmentMutation.isPending} onPress={() => departmentMutation.mutate()} />
          ) : null}
        </View>
      ) : null}

      {tab === 'permissions' ? (
        <View style={styles.panel}>
          {permissionsQuery.isLoading ? <LoadingState message="Loading permissions…" /> : null}
          {permissionsQuery.isError ? (
            <ErrorState
              message={
                isForbiddenError(permissionsQuery.error)
                  ? 'You do not have permission to manage user permissions.'
                  : getErrorMessage(permissionsQuery.error)
              }
              onRetry={() => void permissionsQuery.refetch()}
            />
          ) : null}
          {permissionItems.map((item) => {
            const granted = extraGrants.includes(item.key);
            const denied = extraDenies.includes(item.key);
            return (
              <View key={item.key} style={styles.permissionRow}>
                <View style={styles.permissionCopy}>
                  <Text style={[typography.bodyMd, styles.permissionLabel]}>{item.label}</Text>
                  <Text style={[typography.caption, styles.permissionDesc]}>{item.description}</Text>
                </View>
                {readOnly ? (
                  <StatusBadge
                    label={denied ? 'Denied' : granted ? 'Granted' : 'Role default'}
                    variant={denied ? 'danger' : granted ? 'success' : 'neutral'}
                  />
                ) : (
                  <View style={styles.permissionActions}>
                    <Pressable
                      onPress={() => {
                        setExtraDenies((prev) => prev.filter((key) => key !== item.key));
                        setExtraGrants((prev) =>
                          prev.includes(item.key) ? prev.filter((key) => key !== item.key) : [...prev, item.key]
                        );
                      }}
                      style={[styles.permissionBtn, granted && styles.permissionBtnActive]}
                    >
                      <Text style={styles.permissionBtnText}>Grant</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setExtraGrants((prev) => prev.filter((key) => key !== item.key));
                        setExtraDenies((prev) =>
                          prev.includes(item.key) ? prev.filter((key) => key !== item.key) : [...prev, item.key]
                        );
                      }}
                      style={[styles.permissionBtn, denied && styles.permissionBtnDanger]}
                    >
                      <Text style={styles.permissionBtnText}>Deny</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
          {!readOnly && permissionItems.length > 0 ? (
            <AppButton title="Save permissions" loading={permissionsMutation.isPending} onPress={() => permissionsMutation.mutate()} />
          ) : null}
        </View>
      ) : null}

      {tab === 'security' ? (
        <View style={styles.panel}>
          {!readOnly ? (
            <>
              <AppButton title="Send password reset link" variant="secondary" loading={securityMutation.isPending} onPress={() => securityMutation.mutate('reset')} />
              <AppButton title="Force password reset" variant="secondary" loading={securityMutation.isPending} onPress={() => securityMutation.mutate('force')} />
              <AppButton title="Resend invitation" variant="secondary" loading={securityMutation.isPending} onPress={() => securityMutation.mutate('invite')} />
            </>
          ) : (
            <Text style={[typography.bodySm, styles.readOnlyHint]}>Security actions require Admin or HR access.</Text>
          )}
        </View>
      ) : null}

      {tab === 'activity' ? (
        <View style={styles.panel}>
          {summaryQuery.isLoading ? <LoadingState message="Loading activity…" /> : null}
          {summaryQuery.isError ? (
            <ErrorState message={getErrorMessage(summaryQuery.error)} onRetry={() => void summaryQuery.refetch()} />
          ) : null}
          {summaryQuery.data ? (
            <>
              <InfoRow label="Last activity" value={safeText(summaryQuery.data.last_activity, '—')} />
              <InfoRow label="Last login" value={safeText(summaryQuery.data.last_login, '—')} />
              <InfoRow label="Account created" value={formatDateTime(summaryQuery.data.account_created_at)} />
            </>
          ) : null}
        </View>
      ) : null}

      {tab === 'audit' ? (
        <View style={styles.panel}>
          {auditQuery.isLoading ? <LoadingState message="Loading audit trail…" /> : null}
          {auditQuery.isError ? (
            <ErrorState message={getErrorMessage(auditQuery.error)} onRetry={() => void auditQuery.refetch()} />
          ) : null}
          {(auditQuery.data ?? []).length === 0 && !auditQuery.isLoading ? (
            <Text style={[typography.bodySm, styles.readOnlyHint]}>No audit entries for this user.</Text>
          ) : null}
          {(auditQuery.data ?? []).map((entry) => (
            <View key={entry.id} style={styles.auditRow}>
              <Text style={[typography.labelSm, styles.auditAction]}>{entry.action_type}</Text>
              <Text style={[typography.bodySm, styles.auditMeta]}>
                {safeText(entry.actor_name, 'System')} · {formatDateTime(entry.created_at)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[typography.bodySm, styles.fieldLabel]}>{label}</Text>
      <Text style={[typography.bodyMd, styles.fieldValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  tabScroll: { flexGrow: 0 },
  panel: { gap: spacing.sm, paddingBottom: spacing.md },
  fieldBlock: { gap: spacing.xs },
  fieldLabel: { color: colors.textSecondary, textTransform: 'uppercase' },
  fieldValue: { color: colors.text, fontFamily: 'Inter_600SemiBold' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    minHeight: 48,
  },
  permissionRow: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  permissionCopy: { gap: 2 },
  permissionLabel: { color: colors.text, fontFamily: 'Inter_600SemiBold' },
  permissionDesc: { color: colors.textSecondary },
  permissionActions: { flexDirection: 'row', gap: spacing.sm },
  permissionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  permissionBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  permissionBtnDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  permissionBtnText: { color: colors.text, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  readOnlyHint: { color: colors.textSecondary },
  infoRow: { paddingVertical: spacing.xs },
  auditRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
    paddingVertical: spacing.sm,
  },
  auditAction: { color: colors.text, fontFamily: 'Inter_600SemiBold' },
  auditMeta: { color: colors.textSecondary, marginTop: 2 },
});
