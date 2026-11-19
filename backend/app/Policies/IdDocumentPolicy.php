<?php

namespace App\Policies;

use App\Models\IdDocument;
use App\Models\User;

/**
 * Private ID scans are readable by their owner and by administrators only.
 */
class IdDocumentPolicy
{
    public function view(User $actor, IdDocument $document): bool
    {
        return $actor->isAdmin() || $actor->getKey() === $document->user_id;
    }

    public function download(User $actor, IdDocument $document): bool
    {
        return $this->view($actor, $document);
    }
}
