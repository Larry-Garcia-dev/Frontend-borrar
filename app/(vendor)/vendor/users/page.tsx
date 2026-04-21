"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  UserPlus,
  MoreVertical,
  Edit2,
  Check,
  X,
  Mail,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useVendorStore } from "@/lib/store/vendor-store";
import { cn } from "@/lib/utils";

export default function VendorUsersPage() {
  const { users, isLoading, error, fetchUsers, createUser, updateUser, deleteUser } =
    useVendorStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editDailyLimit, setEditDailyLimit] = useState(100);

  // New user form
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    daily_limit: 100,
  });

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = async () => {
    const created = await createUser(newUser);
    if (created) {
      setShowCreateModal(false);
      setNewUser({ email: "", name: "", daily_limit: 100 });
    }
  };

  const handleEditUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setSelectedUserId(userId);
      setEditDailyLimit(user.daily_limit);
      setShowEditModal(true);
    }
    setMenuOpen(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedUserId) return;
    await updateUser(selectedUserId, { daily_limit: editDailyLimit });
    setShowEditModal(false);
    setSelectedUserId(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Estas seguro de eliminar este usuario?")) return;
    await deleteUser(userId);
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
          <h1 className="text-4xl font-bold text-foreground">Mis Usuarios</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Gestiona los usuarios de tu cuenta vendor
          </p>
        </div>
        <Button
          variant="gradient"
          size="lg"
          onClick={() => setShowCreateModal(true)}
        >
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

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-md"
      >
        <Input
          placeholder="Buscar usuarios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search className="h-5 w-5" />}
        />
      </motion.div>

      {/* Users Grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-xl text-muted-foreground">
            {searchTerm ? "No se encontraron usuarios" : "No tienes usuarios todavia"}
          </p>
          <Button
            variant="gradient"
            className="mt-4"
            onClick={() => setShowCreateModal(true)}
          >
            <UserPlus className="h-5 w-5" />
            Crear tu primer usuario
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user, index) => {
            const quotaPercent = (user.used_quota / user.daily_limit) * 100;
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="relative overflow-hidden transition-all hover:border-primary/50">
                  <CardContent className="p-6">
                    {/* Menu */}
                    <div className="absolute right-4 top-4">
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
                            className="absolute right-0 top-full z-10 w-40 rounded-xl border border-border bg-card p-2 shadow-xl"
                          >
                            <button
                              onClick={() => handleEditUser(user.id)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary"
                            >
                              <Edit2 className="h-4 w-4" />
                              Editar cuota
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-xl font-bold text-white">
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-foreground">
                          {user.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.role}
                        </p>
                      </div>
                    </div>

                    {/* Quota */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Cuota usada</span>
                        <span className="font-medium text-foreground">
                          {user.used_quota}/{user.daily_limit}
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            quotaPercent > 90
                              ? "bg-destructive"
                              : quotaPercent > 70
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          )}
                          style={{ width: `${Math.min(quotaPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create User Modal */}
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
              <p className="mt-2 text-muted-foreground">
                Agrega un nuevo usuario a tu cuenta
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-base font-medium text-foreground">
                    Correo electronico
                  </label>
                  <input
                    type="email"
                    placeholder="email@ejemplo.com"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-base font-medium text-foreground">
                    Nombre (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre del usuario"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-base font-medium text-foreground">
                    Cuota diaria
                  </label>
                  <input
                    type="number"
                    value={newUser.daily_limit}
                    onChange={(e) =>
                      setNewUser({ ...newUser, daily_limit: Number(e.target.value) })
                    }
                    className="mt-2 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none"
                  />
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
                  disabled={!newUser.email}
                >
                  Crear Usuario
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <h3 className="text-2xl font-bold text-foreground">Editar Cuota</h3>
              <div className="mt-6">
                <label className="block text-base font-medium text-foreground">
                  Nueva cuota diaria
                </label>
                <input
                  type="number"
                  value={editDailyLimit}
                  onChange={(e) => setEditDailyLimit(Number(e.target.value))}
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
                <Button variant="gradient" className="flex-1" onClick={handleSaveEdit}>
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
