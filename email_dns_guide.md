# Guide de Délivrabilité des Emails — SPF, DKIM, DMARC
## Portail Certificats CNAN NORD

Ce guide détaille les configurations DNS indispensables pour s'assurer que les alertes d'expiration de certificats et codes OTP envoyés par la plateforme CNAN NORD soient délivrés de manière fiable et n'atterrissent pas dans le dossier Spam des destinataires.

---

## 1. Pourquoi mes emails n'arrivent pas ou vont en Spam ?

Les serveurs de messagerie modernes (Gmail, Outlook, serveurs d'entreprise) utilisent des filtres extrêmement stricts pour identifier et rejeter les spams et usurpations d'identité (phishing).
Si votre serveur envoie des emails au nom de `@cnan-nord.com` depuis une adresse IP non autorisée explicitement dans la zone DNS de votre domaine, l'email sera :
* Soit classé en **Spam**.
* Soit **bloqué** (rejeté complètement) par le serveur destinataire.

Pour éviter cela, vous devez configurer trois protocoles fondamentaux dans les enregistrements DNS de votre domaine `cnan-nord.com`.

---

## 2. Étape 1 : SPF (Sender Policy Framework)

SPF est un enregistrement TXT dans votre DNS qui liste toutes les adresses IP et tous les serveurs autorisés à envoyer des emails avec le domaine `@cnan-nord.com`.

### Exemple de configuration :
Si vous utilisez **Brevo** comme relais de messagerie (recommandé) :
* **Type** : `TXT`
* **Hôte** : `@` (ou laissez vide)
* **Valeur** : `v=spf1 include:spf.sendinblue.com ~all`

Si vous utilisez votre propre serveur SMTP d'entreprise en plus de Brevo :
* **Valeur** : `v=spf1 ip4:192.0.2.1 include:spf.sendinblue.com ~all` *(remplacez 192.0.2.1 par l'IP publique de votre serveur)*.

---

## 3. Étape 2 : DKIM (DomainKeys Identified Mail)

DKIM ajoute une signature cryptographique à chaque email sortant. Le serveur de destination utilise la clé publique publiée dans votre zone DNS pour vérifier que l'email a bien été signé par le domaine expéditeur et n'a pas été altéré en transit.

### Configuration avec Brevo :
Brevo fournit une clé DKIM unique lors de la configuration de votre domaine d'expédition.
* **Type** : `TXT`
* **Hôte/Nom** : `mail._domainkey`
* **Valeur** : `k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ...` *(clé fournie par Brevo)*

---

## 4. Étape 3 : DMARC (Domain-based Message Authentication)

DMARC indique aux serveurs destinataires comment réagir si un email échoue aux tests SPF ou DKIM. Il permet également d'obtenir des rapports sur l'utilisation de votre domaine.

### Configuration recommandée (Politique douce pour démarrer) :
* **Type** : `TXT`
* **Hôte/Nom** : `_dmarc`
* **Valeur** : `v=DMARC1; p=none; rua=mailto:dmarc-reports@cnan-nord.com`

### Configuration de production cible (Politique stricte) :
Une fois que vous avez validé que tous vos flux légitimes passent SPF et DKIM :
* **Valeur** : `v=DMARC1; p=reject; pct=100; rua=mailto:dmarc-reports@cnan-nord.com`

---

## 5. Comment tester votre configuration ?

Avant de déployer en production, vous pouvez tester l'efficacité de vos emails et la conformité DNS via des outils gratuits :
1. **Mail-tester** (`https://www.mail-tester.com/`) : Envoyez un email d'alerte test de la plateforme à l'adresse unique fournie par le site pour obtenir une note sur 10 avec le détail des points d'amélioration.
2. **MXToolbox** (`https://mxtoolbox.com/`) : Analysez la zone DNS de votre domaine pour valider que vos enregistrements SPF, DKIM et DMARC sont exempts d'erreurs de syntaxe.
