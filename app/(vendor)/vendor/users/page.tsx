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
  User as UserIcon,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { api, User } from "@/lib/api-client";
import { formatDate, cn } from "@/lib/utils";

export default function VendorUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  
  // New user form
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await api.getVendorUsers();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
        // Mock data
        setUsers([
          {
            id: "1",
            email: "user1@example.com",
            name: "Juan Garcia",
            role: "user",
            quota: 100,
            used_quota: 45,
            created_at: "2024-03-10",
            is_active: true,
          },
          {
            id: "2",
            email: "user2@example.com",
            name: "Maria Lopez",
            role: "user",
            quota: 200,
            used_quota: 189,
            created_at: "2024-03-15",
            is_active: true,
          },
          {
            id: "3",
            email: "user3@example.com",
            name: "Carlos Rodriguez",
            role: "user",
            quota: 150,
            used_quota: 50,
            created_at: "2024-03-18",
            is_active: false,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = async () => {
    try {
      const created = await api.createVendorUser(newUser);
      setUsers([...users, created]);
      setShowCreateModal(false);
      setNewUser({ name: "", email: "", password: "" });
    } catch (error) {
      console.error("Error creating user:", error);
      // Add mock user for demo
      const mockUser: User = {
        id: String(Date.now()),
        ...newUser,
        role: "user",
        quota: 100,
        used_quota: 0,
        created_at: new Date().toISOString(),
        is_active: true,
      };
      setUsers([...users, mockUser]);
      setShowCreateModal(false);
      setNewUser({ name: "", email: "", password: "" });
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await api.toggleUserStatus(userId);
    } catch (error) {
      console.error("Error toggling status:", error);
    }
    setUsers(
      users.map((u) =>
        u.id === userId ? { ...u, is_active: !u.is_active } : u
      )
    );
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
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user, index) => {
            const quotaPercent = (user.used_quota / user.quota) * 100;
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
                              onClick={() => handleToggleStatus(user.id)}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary"
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
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-xl font-bold text-white">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-foreground">
                          {user.name}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="mt-4">
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
                    </div>

                    {/* Quota */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Cuota usada</span>
                        <span className="font-medium text-foreground">
                          {user.used_quota}/{user.quota}
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
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

                    {/* Date */}
                    <p className="mt-4 text-sm text-muted-foreground">
                      Registrado: {formatDate(user.created_at)}
                    </p>
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
                <Input
                  label="Nombre completo"
                  placeholder="Nombre del usuario"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  icon={<UserIcon className="h-5 w-5" />}
                />
                <Input
                  type="email"
                  label="Correo electronico"
                  placeholder="email@ejemplo.com"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  icon={<Mail className="h-5 w-5" />}
                />
                <Input
                  type="password"
                  label="Contrasena"
                  placeholder="Contrasena inicial"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  icon={<Lock className="h-5 w-5" />}
                />
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
                  disabled={!newUser.name || !newUser.email || !newUser.password}
                >
                  Crear Usuario
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
