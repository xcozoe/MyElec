import { useEffect } from 'react'
import { useSidePanelGuard } from './SidePanel'

/**
 * Branche un éditeur sur le garde-fou du SidePanel :
 *  - calcule l'état "dirty" (valeur du formulaire ≠ valeur initiale) et le
 *    signale au panneau, qui demandera confirmation avant fermeture ;
 *  - renvoie `handleClose`, à câbler sur les boutons « Fermer » / « Annuler »
 *    (passe par la fermeture protégée, ou par `onCancel` hors SidePanel).
 *
 * Le formulaire et l'initial sont comparés via JSON : à l'ouverture ils sont
 * égaux (l'auto-remplissage create reproduit les mêmes id/numero), donc
 * "dirty" ne passe à true qu'après une vraie saisie utilisateur.
 */
export function useEditorGuard(
  formValue: unknown,
  initial: unknown,
  onCancel: () => void,
): () => void {
  const guard = useSidePanelGuard()
  const dirty = JSON.stringify(formValue) !== JSON.stringify(initial)

  useEffect(() => {
    guard?.setDirty(dirty)
  }, [dirty, guard])

  return () => (guard ? guard.requestClose() : onCancel())
}
