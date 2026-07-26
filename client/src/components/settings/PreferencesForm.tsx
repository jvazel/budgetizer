import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { preferencesSchema, currencyCodeEnum } from '../../validators';
import { Settings, Bell, Smartphone, CheckCircle, Download } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { usePwa } from '../../context/PwaContext';
import Select from '../ui/Select';

const currencySymbolMap = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', JPY: '¥' };

const PreferencesForm = ({ user, setUser }) => {
  const { 
    isInstallable, 
    isStandalone, 
    isIOS, 
    installApp,
    pushPermission,
    isPushSubscribed,
    isPushLoading,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
    sendTestPush
  } = usePwa();

  const [showIOSModal, setShowIOSModal] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      currencyCode: user?.currency?.code || 'EUR',
      theme: user?.preferences?.theme || 'dark',
      dateFormat: user?.preferences?.dateFormat || 'DD/MM/YYYY',
      firstDayOfWeek: user?.preferences?.firstDayOfWeek !== undefined ? user.preferences.firstDayOfWeek : 1,
      anomalyThreshold: user?.preferences?.anomalyThreshold || 30,
      lowBalanceThreshold: user?.preferences?.lowBalanceThreshold !== undefined ? user.preferences.lowBalanceThreshold : 100,
      enableBudgetAlerts: user?.preferences?.enableBudgetAlerts !== undefined ? user.preferences.enableBudgetAlerts : true,
      enableScheduledAlerts: user?.preferences?.enableScheduledAlerts !== undefined ? user.preferences.enableScheduledAlerts : true,
      enableSavingsAlerts: user?.preferences?.enableSavingsAlerts !== undefined ? user.preferences.enableSavingsAlerts : true,
      enableLowBalanceAlerts: user?.preferences?.enableLowBalanceAlerts !== undefined ? user.preferences.enableLowBalanceAlerts : true,
      enableAiInsightsAlerts: user?.preferences?.enableAiInsightsAlerts !== undefined ? user.preferences.enableAiInsightsAlerts : true,
    },
  });

  const watchAll = watch();

  const handleSavePreferences = async (prefUpdates) => {
    try {
      const payload = {
        currency: {
          code: prefUpdates.currencyCode || watchAll.currencyCode,
          symbol: currencySymbolMap[prefUpdates.currencyCode || watchAll.currencyCode] || '€'
        },
        theme: prefUpdates.theme !== undefined ? prefUpdates.theme : watchAll.theme,
        dateFormat: prefUpdates.dateFormat !== undefined ? prefUpdates.dateFormat : watchAll.dateFormat,
        firstDayOfWeek: prefUpdates.firstDayOfWeek !== undefined ? prefUpdates.firstDayOfWeek : watchAll.firstDayOfWeek,
        anomalyThreshold: prefUpdates.anomalyThreshold !== undefined ? prefUpdates.anomalyThreshold : watchAll.anomalyThreshold,
        lowBalanceThreshold: prefUpdates.lowBalanceThreshold !== undefined ? prefUpdates.lowBalanceThreshold : watchAll.lowBalanceThreshold,
        enableBudgetAlerts: prefUpdates.enableBudgetAlerts !== undefined ? prefUpdates.enableBudgetAlerts : watchAll.enableBudgetAlerts,
        enableScheduledAlerts: prefUpdates.enableScheduledAlerts !== undefined ? prefUpdates.enableScheduledAlerts : watchAll.enableScheduledAlerts,
        enableSavingsAlerts: prefUpdates.enableSavingsAlerts !== undefined ? prefUpdates.enableSavingsAlerts : watchAll.enableSavingsAlerts,
        enableLowBalanceAlerts: prefUpdates.enableLowBalanceAlerts !== undefined ? prefUpdates.enableLowBalanceAlerts : watchAll.enableLowBalanceAlerts,
        enableAiInsightsAlerts: prefUpdates.enableAiInsightsAlerts !== undefined ? prefUpdates.enableAiInsightsAlerts : watchAll.enableAiInsightsAlerts,
      };

      const res = await api.put('/users/preferences', payload);
      setUser(res.data);
    } catch (err) {
      toast.error('Erreur de sauvegarde des préférences');
    }
  };

  const handleCurrencyChange = (e) => {
    const code = e.target.value;
    setValue('currencyCode', code);
    handleSavePreferences({ currencyCode: code });
  };

  return (
    <div className="space-y-6">
      {/* Preferences Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider px-1 flex items-center gap-1.5">
          <Settings size={14} className="text-accent" /> Préférences de l'application
        </h3>

        <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 space-y-5">
          {/* Currency picker */}
          <div className="flex justify-between items-center gap-4">
            <div>
              <h4 className="text-xs font-bold text-primary">Devise par défaut</h4>
              <p className="text-[10px] text-muted">Devise utilisée pour tes budgets et affichages.</p>
            </div>
            <Select
              value={watchAll.currencyCode}
              onChange={handleCurrencyChange}
              align="right"
              className={`bg-surface border px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none ${errors.currencyCode ? 'border-danger' : 'border-border/40'}`}
            >
              <option value="EUR">Euro (€)</option>
              <option value="USD">Dollar US ($)</option>
              <option value="GBP">Livre Sterling (£)</option>
              <option value="CHF">Franc Suisse (CHF)</option>
              <option value="JPY">Yen Japonais (¥)</option>
            </Select>
          </div>

          {errors.currencyCode && <p className="text-[10px] text-danger pl-1">{errors.currencyCode.message}</p>}

          <hr className="border-border/30" />

          {/* Date format picker */}
          <div className="flex justify-between items-center gap-4">
            <div>
              <h4 className="text-xs font-bold text-primary">Format de date</h4>
              <p className="text-[10px] text-muted">Format utilisé pour afficher les dates dans l'app.</p>
            </div>
            <Select
              value={watchAll.dateFormat}
              onChange={(e) => {
                setValue('dateFormat', e.target.value);
                handleSavePreferences({ dateFormat: e.target.value });
              }}
              align="right"
              className={`bg-surface border px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none ${errors.dateFormat ? 'border-danger' : 'border-border/40'}`}
            >
              <option value="DD/MM/YYYY">JJ/MM/AAAA</option>
              <option value="YYYY-MM-DD">AAAA-MM-JJ</option>
              <option value="MM/DD/YYYY">MM/JJ/AAAA</option>
            </Select>
          </div>

          {errors.dateFormat && <p className="text-[10px] text-danger pl-1">{errors.dateFormat.message}</p>}

          <hr className="border-border/30" />

          {/* First day of week picker */}
          <div className="flex justify-between items-center gap-4">
            <div>
              <h4 className="text-xs font-bold text-primary">Premier jour de la semaine</h4>
              <p className="text-[10px] text-muted">Jour de démarrage pour les vues calendrier et hebdomadaires.</p>
            </div>
            <Select
              value={watchAll.firstDayOfWeek}
              onChange={(e) => {
                const val = Number(e.target.value);
                setValue('firstDayOfWeek', val);
                handleSavePreferences({ firstDayOfWeek: val });
              }}
              align="right"
              className={`bg-surface border px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none ${errors.firstDayOfWeek ? 'border-danger' : 'border-border/40'}`}
            >
              <option value={1}>Lundi</option>
              <option value={0}>Dimanche</option>
            </Select>
          </div>

          {errors.firstDayOfWeek && <p className="text-[10px] text-danger pl-1">{errors.firstDayOfWeek.message}</p>}

          <hr className="border-border/30" />

          {/* AI Anomaly Sensitivity */}
          <div className="flex justify-between items-center gap-4">
            <div>
              <h4 className="text-xs font-bold text-primary">Sensibilité d'anomalie (IA)</h4>
              <p className="text-[10px] text-muted">Seuil de dépassement par défaut pour tes alertes.</p>
            </div>
            <Select
              value={watchAll.anomalyThreshold}
              onChange={(e) => {
                const val = Number(e.target.value);
                setValue('anomalyThreshold', val);
                handleSavePreferences({ anomalyThreshold: val });
              }}
              align="right"
              className={`bg-surface border px-3 py-2 rounded-xl text-xs font-bold text-primary focus:outline-none ${errors.anomalyThreshold ? 'border-danger' : 'border-border/40'}`}
            >
              <option value={30}>+30% (Sensible)</option>
              <option value={40}>+40%</option>
              <option value={50}>+50%</option>
              <option value={60}>+60% (Modéré)</option>
            </Select>
          </div>

          {errors.anomalyThreshold && <p className="text-[10px] text-danger pl-1">{errors.anomalyThreshold.message}</p>}

          <hr className="border-border/30" />

          {/* Notifications settings */}
          <div className="space-y-4 pt-1">
            <h4 className="text-xs font-extrabold text-accent uppercase tracking-wider flex items-center gap-1.5">
              <Bell size={14} /> Alertes & Notifications
            </h4>
            
            <div className="space-y-3 pl-1">
              {/* Low Balance Threshold */}
              <div className="flex justify-between items-center gap-4">
                <div>
                  <span className="text-xs text-primary font-medium">Seuil de solde bas</span>
                  <p className="text-[9px] text-muted font-normal mt-0.5">Seuil en dessous duquel une alerte de solde est générée.</p>
                </div>
                <div className="flex items-center gap-1 bg-surface border border-border/40 rounded-xl px-2.5 py-1.5">
                  <input
                    type="number"
                    min="0"
                    {...register('lowBalanceThreshold')}
                    onBlur={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      setValue('lowBalanceThreshold', val);
                      handleSavePreferences({ lowBalanceThreshold: val });
                    }}
                    className={`bg-transparent text-xs font-bold text-primary w-14 text-right focus:outline-none ${errors.lowBalanceThreshold ? 'text-danger' : ''}`}
                  />
                  <span className="text-[10px] text-muted font-bold">{currencySymbolMap[watchAll.currencyCode] || '€'}</span>
                </div>
              </div>

              {errors.lowBalanceThreshold && <p className="text-[10px] text-danger pl-1">{errors.lowBalanceThreshold.message}</p>}

              <hr className="border-border/20" />

              {/* Enable Budget Alerts */}
              <div className="flex justify-between items-center gap-4">
                <div>
                  <span className="text-xs text-primary font-medium">Alertes Budgets</span>
                  <p className="text-[9px] text-muted font-normal mt-0.5">Alerte lorsque les budgets mensuels sont presque épuisés.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    {...register('enableBudgetAlerts')}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setValue('enableBudgetAlerts', val);
                      handleSavePreferences({ enableBudgetAlerts: val });
                    }}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-muted peer-checked:after:bg-white after:border-border after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              <hr className="border-border/20" />

              {/* Enable Scheduled Alerts */}
              <div className="flex justify-between items-center gap-4">
                <div>
                  <span className="text-xs text-primary font-medium">Transactions Planifiées</span>
                  <p className="text-[9px] text-muted font-normal mt-0.5">Notifications pour les prélèvements et abonnements à venir.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    {...register('enableScheduledAlerts')}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setValue('enableScheduledAlerts', val);
                      handleSavePreferences({ enableScheduledAlerts: val });
                    }}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-muted peer-checked:after:bg-white after:border-border after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              <hr className="border-border/20" />

              {/* Enable Savings Alerts */}
              <div className="flex justify-between items-center gap-4">
                <div>
                  <span className="text-xs text-primary font-medium">Objectifs d'Épargne</span>
                  <p className="text-[9px] text-muted font-normal mt-0.5">Suivi et félicitations pour tes objectifs d'épargne.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    {...register('enableSavingsAlerts')}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setValue('enableSavingsAlerts', val);
                      handleSavePreferences({ enableSavingsAlerts: val });
                    }}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-muted peer-checked:after:bg-white after:border-border after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              <hr className="border-border/20" />

              {/* Enable Low Balance Alerts */}
              <div className="flex justify-between items-center gap-4">
                <div>
                  <span className="text-xs text-primary font-medium">Soldes de Comptes</span>
                  <p className="text-[9px] text-muted font-normal mt-0.5">Alertes lorsque tes comptes passent sous le seuil configuré.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    {...register('enableLowBalanceAlerts')}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setValue('enableLowBalanceAlerts', val);
                      handleSavePreferences({ enableLowBalanceAlerts: val });
                    }}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-muted peer-checked:after:bg-white after:border-border after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              <hr className="border-border/20" />

              {/* Enable AI Insights Alerts */}
              <div className="flex justify-between items-center gap-4">
                <div>
                  <span className="text-xs text-primary font-medium">Analyses & IA Insights</span>
                  <p className="text-[9px] text-muted font-normal mt-0.5">Recommandations intelligentes et alertes de dépenses anormales.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    {...register('enableAiInsightsAlerts')}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setValue('enableAiInsightsAlerts', val);
                      handleSavePreferences({ enableAiInsightsAlerts: val });
                    }}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-muted peer-checked:after:bg-white after:border-border after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              <hr className="border-border/20" />

              {/* PWA Web Push Subscription */}
              <div className="flex flex-col space-y-3 pt-2">
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <span className="text-xs text-primary font-bold">Notifications Push sur cet appareil</span>
                    <p className="text-[9px] text-muted font-normal mt-0.5">
                      {pushPermission === 'unsupported' 
                        ? "Non supporté par ce navigateur."
                        : pushPermission === 'denied'
                        ? "Bloqué par les réglages de ton navigateur."
                        : isPushSubscribed
                        ? "Abonné aux notifications sur cet appareil."
                        : "Reçois les alertes en tâche de fond."}
                    </p>
                  </div>
                  {pushPermission !== 'unsupported' && pushPermission !== 'denied' && (
                    <button
                      type="button"
                      disabled={isPushLoading}
                      onClick={async () => {
                        try {
                          if (isPushSubscribed) {
                            await unsubscribeFromPushNotifications();
                            toast.success('Désabonné avec succès');
                          } else {
                            await subscribeToPushNotifications();
                            toast.success('Abonné avec succès !');
                          }
                        } catch (err) {
                          toast.error(err.message || 'Échec de la configuration');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all shrink-0 active:scale-95 ${
                        isPushSubscribed
                          ? 'bg-danger/10 border border-danger/25 text-danger'
                          : 'bg-accent text-white shadow-sm'
                      }`}
                    >
                      {isPushLoading ? 'Chargement...' : isPushSubscribed ? 'Désactiver' : 'Activer'}
                    </button>
                  )}
                </div>
                
                {isPushSubscribed && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await sendTestPush();
                        toast.success('Test envoyé ! Vérifie tes notifications.');
                      } catch (err) {
                        toast.error('Échec de l\'envoi du test');
                      }
                    }}
                    className="w-full bg-surface border border-border/30 hover:bg-border/10 text-muted hover:text-primary py-2 rounded-xl text-[10px] font-bold active:scale-98 transition-all flex items-center justify-center gap-1"
                  >
                    <Bell size={10} /> Tester la notification push
                  </button>
                )}
              </div>
            </div>
          </div>

          <hr className="border-border/30" />

          {/* Theme switcher */}
          <div className="flex justify-between items-center gap-4">
            <div>
              <h4 className="text-xs font-bold text-primary">Thème de l'interface</h4>
              <p className="text-[10px] text-muted">Basculer le style visuel de l'application.</p>
            </div>
            <div className="flex bg-surface p-1 rounded-xl border border-border/40">
              <button
                onClick={() => {
                  handleSavePreferences({ theme: 'dark' });
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  watchAll.theme === 'dark' ? 'bg-surface-2 text-primary shadow-sm' : 'text-muted'
                }`}
              >
                Sombre
              </button>
              <button
                onClick={() => {
                  handleSavePreferences({ theme: 'light' });
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  watchAll.theme === 'light' ? 'bg-surface-2 text-primary shadow-sm' : 'text-muted'
                }`}
              >
                Clair
              </button>
            </div>
          </div>

          {errors.theme && <p className="text-[10px] text-danger pl-1">{errors.theme.message}</p>}
        </div>
      </div>

      {/* PWA Installation Option */}
      {(isInstallable || isIOS || isStandalone) && (
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-secondary uppercase tracking-wider px-1 flex items-center gap-1.5">
            <Smartphone size={14} className="text-accent" /> Raccourci d'application
          </h3>

          <div className="bg-surface-2 p-5 rounded-[28px] border border-border/40 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-primary">Budgetizer sur ton appareil</h4>
              <p className="text-[10px] text-muted">
                {isStandalone 
                  ? "L'application est installée sur ton appareil et fonctionne de manière autonome." 
                  : "Installe l'application pour y accéder directement depuis ton écran d'accueil."}
              </p>
            </div>

            {isStandalone ? (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-accent/10 border border-accent/20 text-accent">
                <CheckCircle size={16} />
                <span className="text-xs font-bold">Application installée</span>
              </div>
            ) : (
              <button 
                onClick={() => isIOS ? setShowIOSModal(true) : installApp()}
                className="w-full bg-accent text-white py-3.5 rounded-2xl text-xs font-bold hover:scale-101 active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-accent/15"
              >
                <Download size={14} />
                {isIOS ? "Installer sur iPhone (Safari)" : "Installer l'application"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* IOS share modal */}
      {showIOSModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border max-w-sm w-full rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-extrabold text-primary">Installer sur iOS</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Pour installer Budgetizer sur ton iPhone :
            </p>
            <ol className="list-decimal pl-4 text-xs text-secondary space-y-1.5">
              <li>Appuyez sur le bouton <strong>Partager</strong> en bas de Safari.</li>
              <li>Faites défiler vers le bas et sélectionnez <strong>Sur l'écran d'accueil</strong>.</li>
              <li>Appuyez sur <strong>Ajouter</strong> en haut à droite.</li>
            </ol>
            <button 
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-surface-2 border border-border/40 py-2.5 rounded-xl text-xs font-bold text-primary hover:bg-border/20 transition-all"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreferencesForm;
