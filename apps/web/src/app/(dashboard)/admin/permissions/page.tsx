"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Search, Plus, Minus, Check } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api/client";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "hr_operations", label: "HR & Operations" },
  { value: "manager", label: "Manager" },
  { value: "team_lead", label: "Team Lead" },
  { value: "employee", label: "Employee" },
  { value: "intern", label: "Intern" },
  { value: "junior_employee", label: "Junior Employee" },
];

const PERMISSION_GROUPS: Record<string, string[]> = {
  "User Management": [
    "users.view_all",
    "users.create",
    "users.edit",
    "users.deactivate",
    "users.suspend",
    "users.manage_roles",
  ],
  Attendance: [
    "attendance.view_own",
    "attendance.view_team",
    "attendance.view_org",
    "attendance.approve_correction",
  ],
  Leave: ["leave.apply", "leave.approve", "leave.view_team", "leave.view_org"],
  "Projects & Tasks": [
    "projects.create",
    "projects.approve",
    "projects.view_all",
    "tasks.create_own",
    "tasks.create_team",
    "tasks.set_priority",
    "tasks.set_complexity",
    "tasks.view_team",
  ],
  "EOD Reports": ["eod.submit", "eod.review", "eod.approve"],
  "Analytics & Reports": [
    "reports.view_own",
    "reports.view_team",
    "reports.view_org",
    "analytics.view_team",
    "analytics.view_org",
  ],
  Organization: [
    "announcements.create",
    "holidays.manage",
    "shifts.manage",
    "departments.manage",
  ],
  System: ["audit.view", "permissions.manage"],
};

export default function AdminPermissionsPage() {
  const [selectedRole, setSelectedRole] = useState("manager");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [allPermissions, setAllPermissions] = useState<
    { key: string; description: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadPermissions();
  }, []);

  useEffect(() => {
    loadRolePermissions();
  }, [selectedRole]);

  const loadPermissions = async () => {
    try {
      const response =
        await apiClient.get<{ key: string; description: string }[]>(
          "/permissions/",
        );
      setAllPermissions(response.data);
    } catch {
      toast.error("Failed to load permissions");
    }
  };

  const loadRolePermissions = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<string[]>(
        `/permissions/role/${selectedRole}`,
      );
      setRolePermissions(response.data);
    } catch {
      toast.error("Failed to load role permissions");
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (key: string) => rolePermissions.includes(key);

  const filteredGroups = Object.entries(PERMISSION_GROUPS)
    .map(([group, keys]) => ({
      group,
      keys: keys.filter((k) => !search || k.includes(search.toLowerCase())),
    }))
    .filter((g) => g.keys.length > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Permission Manager
        </h1>
        <p className="text-slate-500">
          View role-permission mappings and manage per-user overrides.
        </p>
      </div>

      {/* Role Selector */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>Role Permission Matrix</CardTitle>
              <CardDescription>
                View permissions assigned to each role in the system.
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Filter permissions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {filteredGroups.map(({ group, keys }) => (
              <div key={group}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  {group}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {keys.map((key) => {
                    const granted = hasPermission(key);
                    const perm = allPermissions.find((p) => p.key === key);
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition-colors ${
                          granted
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-slate-50 border-slate-100 text-slate-400"
                        }`}
                      >
                        <div
                          className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                            granted ? "bg-emerald-500" : "bg-slate-200"
                          }`}
                        >
                          {granted ? (
                            <Check className="h-3 w-3 text-white" />
                          ) : (
                            <Minus className="h-3 w-3 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{key}</p>
                          {perm?.description && (
                            <p className="text-xs opacity-70">
                              {perm.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Panel */}
      <Card className="border-none shadow-sm bg-blue-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-blue-600" />
            Permission System Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>
            • <strong>Intern</strong> and <strong>Junior Employee</strong> share
            the same base permission set (BASIC_EMPLOYEE_RESTRICTED).
          </p>
          <p>
            • Per-user overrides can be granted or revoked via the API endpoint{" "}
            <code className="bg-slate-100 px-1 rounded">
              /permissions/user-override
            </code>
            .
          </p>
          <p>
            • Role changes automatically update permission scope on next login.
          </p>
          <p>
            • Admins are the only role with{" "}
            <code className="bg-slate-100 px-1 rounded">
              permissions.manage
            </code>{" "}
            access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
