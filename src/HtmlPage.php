<?php

/*
 * This file is part of the Сáша framework.
 *
 * (c) tchiotludo <http://github.com/tchiotludo>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare(strict_types = 1);

namespace Cawa\Spf;

use Cawa\Renderer\Container;
use Cawa\Renderer\HtmlContainer;
use Cawa\Renderer\HtmlElement;

class HtmlPage extends \Cawa\Renderer\HtmlPage
{
    /**
     * @param Container|HtmlContainer $container
     *
     * @return string
     */
    protected function renderSpfAsset($container) : string
    {
        $return = '';
        /** @var HtmlElement $element */
        foreach ($container->getElements() as $element) {
            if ($element->getTag() == '<link />' && $element->getAttribute('rel') == 'preload') {
                continue;
            }

            if ($element->getTag() != '<link />' && $element->getTag() != '<script>') {
                continue;
            }

            $return .= $element->render();
        }

        return $return;
    }
}
