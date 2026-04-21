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
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminStore } from "@/lib/store/admin-store";
import { formatDate, cn } from "@/lib/utils";

const roleColors: Record<string, string> = {
  ADMIN: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  VENDOR: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  CREATOR: "bg-green-500/10 text-green-500 border-green-500/30",
};

const roleIcons: Record<string, typeof Shield> = {
  ADMIN: Shield,
  VENDOR: Store,
  CREATOR: UserIcon,
};

export default function AdminUsersPage() {
  const { users, isLoading, error, fetchUsers, updateUser, deleteUser, resetUserQuota, createUser } =
    useAdminStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ daily_limit: 0, role: "", is_unlimited: false });
  const [newUserData, setNewUserData] = useState({ email: "", role: "CREATOR", daily_limit: 10, is_unlimited: false });
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role.toUpperCase() === roleFilter.toUpperCase();
    return matchesSearch && matchesRole;
  });

  const handleEditUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setSelectedUserId(userId);
      setEditData({
        daily_limit: user.daily_limit,
        role: user.role,
        is_unlimited: user.is_unlimited,
      });
      setShowEditModal(true);
    }
    setMenuOpen(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedUserId) return;
    await updateUser(selectedUserId, editData);
    setShowEditModal(false);
    setSelectedUserId(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Estas seguro de eliminar este usuario?")) return;
    await deleteUser(userId);
    setMenuOpen(null);
  };

  const handleResetQuota = async (userId: string) => {
    await resetUserQuota(userId);
    setMenuOpen(null);
  };

  const handleCreateUser = async () => {
    await createUser(newUserData);
    setShowCreateModal(false);
    setNewUserData({ email: "", role: "CREATOR", daily_limit: 10, is_unlimited: false });
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
        <Button variant="gradient" size="lg" onClick={() => setShowCreateModal(true)}>
          <UserPlus className="h-5 w-5" />
          Crear Usuario
        </Button>
      </motion.div>

      {/* Error display */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-4 sm:flex-row"
      >
        <div className="flex-1">
          <Input
            placeholder="Buscar por email..."
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
            <option value="ADMIN">Macondo admin</option>
            <option value="VENDOR">Estudios</option>
            <option value="CREATOR">Modelos</option>
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
                      <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => {
                      const role = user.role.toUpperCase();
                      const RoleIcon = roleIcons[role] || UserIcon;
                      const quotaPercent = user.is_unlimited
                        ? 0
                        : (user.used_quota / user.daily_limit) * 100;
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
                                {user.email.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">
                                  {user.email}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  ID: {user.id.slice(0, 8)}...
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm font-medium",
                                roleColors[role] || roleColors.CREATOR
                              )}
                            >
                              <RoleIcon className="h-4 w-4" />
                              {role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {user.is_unlimited ? (
                              <span className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                                Ilimitado
                              </span>
                            ) : (
                              <div className="w-32">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-foreground">
                                    {user.used_quota}/{user.daily_limit}
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
                                        ? "bg-yellow-500"
                                        : "bg-green-500"
                                    )}
                                    style={{
                                      width: `${Math.min(quotaPercent, 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-500">
                              <Check className="h-4 w-4" />
                              Activo
                            </span>
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
                                      onClick={() => handleEditUser(user.id)}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-secondary"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleResetQuota(user.id)}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-secondary"
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                      Resetear cuota
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

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
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
              <h3 className="text-2xl font-bold text-foreground">Editar Usuario</h3>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-base font-medium text-foreground">
                    Rol
                  </label>
                  <select
                    value={editData.role}
                    onChange={(e) =>
                      setEditData({ ...editData, role: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="CREATOR">Creador</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-base font-medium text-foreground">
                    Cuota Diaria
                  </label>
                  <input
                    type="number"
                    value={editData.daily_limit}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        daily_limit: Number(e.target.value),
                      })
                    }
                    disabled={editData.is_unlimited}
                    className="mt-2 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_unlimited"
                    checked={editData.is_unlimited}
                    onChange={(e) =>
                      setEditData({ ...editData, is_unlimited: e.target.checked })
                    }
                    className="h-5 w-5 rounded border-input"
                  />
                  <label htmlFor="is_unlimited" className="text-foreground">
                    Cuota ilimitada
                  </label>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancelar
                </Button>
                <Button variant="gradient" className="flex-1" onClick={handleSaveEdit}>
                  Guardar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-card p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-foreground">Crear Usuario</h3>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-base font-medium text-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) =>
                      setNewUserData({ ...newUserData, email: e.target.value })
                    }
                    placeholder="usuario@ejemplo.com"
                    className="mt-2 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-base font-medium text-foreground">
                    Rol
                  </label>
                  <select
                    value={newUserData.role}
                    onChange={(e) =>
                      setNewUserData({ ...newUserData, role: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="CREATOR">Creador</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-base font-medium text-foreground">
                    Cuota Diaria
                  </label>
                  <input
                    type="number"
                    value={newUserData.daily_limit}
                    onChange={(e) =>
                      setNewUserData({
                        ...newUserData,
                        daily_limit: Number(e.target.value),
                      })
                    }
                    disabled={newUserData.is_unlimited}
                    className="mt-2 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="new_is_unlimited"
                    checked={newUserData.is_unlimited}
                    onChange={(e) =>
                      setNewUserData({ ...newUserData, is_unlimited: e.target.checked })
                    }
                    className="h-5 w-5 rounded border-input"
                  />
                  <label htmlFor="new_is_unlimited" className="text-foreground">
                    Cuota ilimitada
                  </label>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="gradient"
                  className="flex-1"
                  onClick={handleCreateUser}
                  disabled={!newUserData.email}
                >
                  Crear
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
