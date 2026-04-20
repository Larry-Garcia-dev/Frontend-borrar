"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  User as UserIcon,
  Store,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, User } from "@/lib/api-client";
import { formatDate, cn } from "@/lib/utils";

const roleColors = {
  admin: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  vendor: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  user: "bg-green-500/10 text-green-500 border-green-500/30",
};

const roleIcons = {
  admin: Shield,
  vendor: Store,
  user: UserIcon,
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editQuota, setEditQuota] = useState(0);
  const [page, setPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await api.getUsers(page, 20);
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
        // Mock data for demo
        setUsers([
          {
            id: "1",
            email: "admin@macondo.ai",
            name: "Admin Principal",
            role: "admin",
            quota: 10000,
            used_quota: 1234,
            created_at: "2024-01-15",
            is_active: true,
          },
          {
            id: "2",
            email: "vendor1@example.com",
            name: "Vendor Alpha",
            role: "vendor",
            quota: 5000,
            used_quota: 2341,
            created_at: "2024-02-20",
            is_active: true,
          },
          {
            id: "3",
            email: "user1@example.com",
            name: "Juan Garcia",
            role: "user",
            quota: 100,
            used_quota: 45,
            created_at: "2024-03-10",
            is_active: true,
          },
          {
            id: "4",
            email: "user2@example.com",
            name: "Maria Lopez",
            role: "user",
            quota: 200,
            used_quota: 189,
            created_at: "2024-03-15",
            is_active: true,
          },
          {
            id: "5",
            email: "vendor2@example.com",
            name: "Vendor Beta",
            role: "vendor",
            quota: 3000,
            used_quota: 567,
            created_at: "2024-03-20",
            is_active: false,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [page]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleToggleStatus = async (userId: string) => {
    try {
      await api.toggleUserStatus(userId);
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, is_active: !u.is_active } : u
        )
      );
    } catch (error) {
      console.error("Error toggling user status:", error);
    }
    setMenuOpen(null);
  };

  const handleUpdateQuota = async () => {
    if (!selectedUser) return;
    try {
      await api.updateUserQuota({ user_id: selectedUser.id, quota: editQuota });
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id ? { ...u, quota: editQuota } : u
        )
      );
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error updating quota:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Estas seguro de eliminar este usuario?")) return;
    try {
      await api.deleteUser(userId);
      setUsers(users.filter((u) => u.id !== userId));
    } catch (error) {
      console.error("Error deleting user:", error);
    }
    setMenuOpen(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold text-foreground">Usuarios</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Gestiona todos los usuarios de la plataforma
          </p>
        </div>
        <Button variant="gradient" size="lg">
          <UserPlus className="h-5 w-5" />
          Crear Usuario
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-4 sm:flex-row"
      >
        <div className="flex-1">
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="h-5 w-5" />}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">Todos los roles</option>
            <option value="admin">Administradores</option>
            <option value="vendor">Vendors</option>
            <option value="user">Usuarios</option>
          </select>
        </div>
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                        Usuario
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                        Rol
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                        Cuota
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                        Estado
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                        Registro
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => {
                      const RoleIcon = roleIcons[user.role];
                      const quotaPercent = (user.used_quota / user.quota) * 100;
                      return (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-border/50 hover:bg-secondary/30"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-lg font-bold text-white">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">
                                  {user.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm font-medium capitalize",
                                roleColors[user.role]
                              )}
                            >
                              <RoleIcon className="h-4 w-4" />
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-32">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-foreground">
                                  {user.used_quota}/{user.quota}
                                </span>
                                <span className="text-muted-foreground">
                                  {quotaPercent.toFixed(0)}%
                                </span>
                              </div>
                              <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    quotaPercent > 90
                                      ? "bg-destructive"
                                      : quotaPercent > 70
                                      ? "bg-warning"
                                      : "bg-success"
                                  )}
                                  style={{ width: `${Math.min(quotaPercent, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium",
                                user.is_active
                                  ? "bg-success/10 text-success"
                                  : "bg-destructive/10 text-destructive"
                              )}
                            >
                              {user.is_active ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                              {user.is_active ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {formatDate(user.created_at)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setMenuOpen(menuOpen === user.id ? null : user.id)
                                }
                                className="rounded-lg p-2 hover:bg-secondary"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </button>
                              <AnimatePresence>
                                {menuOpen === user.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="absolute right-0 top-full z-10 mt-2 w-48 rounded-xl border border-border bg-card p-2 shadow-xl"
                                  >
                                    <button
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setEditQuota(user.quota);
                                        setShowEditModal(true);
                                        setMenuOpen(null);
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-secondary"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                      Editar cuota
                                    </button>
                                    <button
                                      onClick={() => handleToggleStatus(user.id)}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-secondary"
                                    >
                                      {user.is_active ? (
                                        <>
                                          <X className="h-4 w-4" />
                                          Desactivar
                                        </>
                                      ) : (
                                        <>
                                          <Check className="h-4 w-4" />
                                          Activar
                                        </>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Eliminar
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-4 text-muted-foreground">Pagina {page}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Edit Quota Modal */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-card p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-foreground">Editar Cuota</h3>
              <p className="mt-2 text-muted-foreground">
                Usuario: {selectedUser.name}
              </p>
              <div className="mt-6">
                <label className="block text-base font-medium text-foreground">
                  Nueva cuota
                </label>
                <input
                  type="number"
                  value={editQuota}
                  onChange={(e) => setEditQuota(Number(e.target.value))}
                  className="mt-2 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-lg text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </Button>
                <Button variant="gradient" className="flex-1" onClick={handleUpdateQuota}>
                  Guardar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
