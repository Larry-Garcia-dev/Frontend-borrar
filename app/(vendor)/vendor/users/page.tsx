"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useVendorStore } from "@/lib/store/vendor-store";
import { cn } from "@/lib/utils";

export default function VendorUsersPage() {
  const { users, isLoading, error, fetchUsers, createUser, updateUser, deleteUser } = useVendorStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editDailyLimit, setEditDailyLimit] = useState(100);

  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    daily_limit: 100,
  });

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((user) =>
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
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;
    await deleteUser(userId);
    setMenuOpen(null);
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">
            Dashboard de Estudio
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Estadísticas y rendimiento de las modelos de tu estudio
          </p>
          <span className="font-medium text-foreground">
            Gestionar Cuentas de Modelos
          </span>
        </div>
        <Button variant="gradient" size="lg" onClick={() => setShowCreateModal(true)}>
          <UserPlus className="h-5 w-5" />
          Crear Cuenta de Modelo
        </Button>
      </motion.div>

      {error && <div className="rounded-lg bg-destructive/10 p-4 text-destructive">{error}</div>}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="max-w-md">
        <Input placeholder="Buscar modelo por email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} icon={<Search className="h-5 w-5" />} />
      </motion.div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-xl text-muted-foreground">{searchTerm ? "No se encontraron modelos" : "No tienes modelos todavía"}</p>
          <Button variant="gradient" className="mt-4" onClick={() => setShowCreateModal(true)}>
            <UserPlus className="h-5 w-5" />
            Crear primera cuenta
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user, index) => {
            const quotaPercent = (user.used_quota / user.daily_limit) * 100;
            return (
              <motion.div key={user.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card className="relative overflow-hidden transition-all hover:border-primary/50">
                  <CardContent className="p-6">
                    <div className="absolute right-4 top-4">
                      <button onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)} className="rounded-lg p-2 hover:bg-secondary">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      <AnimatePresence>
                        {menuOpen === user.id && (
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-0 top-full z-10 w-40 rounded-xl border border-border bg-card p-2 shadow-xl">
                            <button onClick={() => handleEditUser(user.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary">
                              <Edit2 className="h-4 w-4" /> Editar cuota
                            </button>
                            <button onClick={() => handleDeleteUser(user.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" /> Eliminar
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-xl font-bold text-white">
                        {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-foreground truncate w-40">{user.name || user.email}</p>
                        <p className="text-xs text-muted-foreground truncate w-40">{user.email}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Fotos generadas</span>
                        <span className="font-medium text-foreground">{user.used_quota}/{user.daily_limit}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                        <div className={cn("h-full rounded-full transition-all", quotaPercent > 90 ? "bg-destructive" : quotaPercent > 70 ? "bg-yellow-500" : "bg-green-500")} style={{ width: `${Math.min(quotaPercent, 100)}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowCreateModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-md rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-foreground">Nueva Cuenta de Modelo</h3>
              <p className="mt-2 text-sm text-muted-foreground">Ojo: Asegúrate de no exceder el límite de modelos permitidos para tu estudio.</p>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground">Nombre de la Modelo</label>
                  <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Ej: Camila" className="mt-2 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">Correo Electrónico *</label>
                  <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="camila@ejemplo.com" className="mt-2 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">Límite de fotos (Cuota Diaria)</label>
                  <input type="number" value={newUser.daily_limit} onChange={(e) => setNewUser({ ...newUser, daily_limit: Number(e.target.value) })} className="mt-2 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-foreground focus:border-primary focus:outline-none" />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                <Button variant="gradient" className="flex-1" onClick={handleCreateUser} disabled={!newUser.email || isSubmitting}>Crear Cuenta</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowEditModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-md rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-foreground">Editar Cuota de Modelo</h3>
              <div className="mt-6">
                <label className="block text-sm font-medium text-foreground">Nuevo límite de fotos</label>
                <input type="number" value={editDailyLimit} onChange={(e) => setEditDailyLimit(Number(e.target.value))} className="mt-2 w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-lg text-foreground focus:border-primary focus:outline-none" />
              </div>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>Cancelar</Button>
                <Button variant="gradient" className="flex-1" onClick={handleSaveEdit}>Guardar</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}