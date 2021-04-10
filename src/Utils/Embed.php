<?php declare(strict_types=1);

namespace App\Utils;

use Exception;
use Symfony\Component\Cache\Adapter\FilesystemAdapter;
use Symfony\Contracts\Cache\ItemInterface;
use Embed\Embed as BaseEmbed;
use App\Service\ImageManager;
use App\Entity\Entry;

class Embed
{
    public ?string $url = null;
    public ?string $title = null;
    public ?string $image = null;
    public ?string $html = null;

    public function fetch($url): self
    {
        $cache = new FilesystemAdapter();

        return $cache->get(
            'embed_'.md5($url),
            function (ItemInterface $item) use ($url) {
                $item->expiresAfter(3600);

                try {
                    $embed  = (new BaseEmbed())->get($url);
                    $oembed = $embed->getOEmbed();
                } catch (Exception $e) {
                    return $this;
                }

                $this->url   = $url;
                $this->title = $embed->title;
                $this->image = (string) $embed->image;
                $this->html  = $this->cleanIframe($oembed->html('html'));

                if (!$this->html && $embed->code) {
                    $this->html = $this->cleanIframe($embed->code->html);
                }

                return $this;
            }
        );
    }

    public function isImageUrl(): bool
    {
        if (!$this->url) {
            return false;
        }

        return ImageManager::isImageUrl($this->url);
    }

    public function getType(): string
    {
        if ($this->isImageUrl()) {
            return Entry::ENTRY_TYPE_IMAGE;
        }

        if ($this->isVideoEmbed()) {
            return Entry::ENTRY_TYPE_VIDEO;
        }

        return Entry::ENTRY_TYPE_LINK;
    }

    private function cleanIframe(?string $html): ?string
    {
        return $html;

//        $types = [
//            str_starts_with($html, '<iframe'),
//            str_starts_with($html, '<video'),
//            str_starts_with($html, '<img'),
//        ];
//
//        if (count(array_unique($types)) === 1) {
//            return null;
//        }
//
//        return preg_replace('/(height)(=)"([\d]+)"/', '${1}${2}"auto"', $html);
    }

    private function isVideoEmbed(): bool
    {
        if (!$this->html) {
            return false;
        }

        return str_contains($this->html, 'video')
            || str_contains($this->html, 'youtube')
            || str_contains($this->html, 'vimeo')
            || str_contains($this->html, 'streamable'); // @todo
    }
}
