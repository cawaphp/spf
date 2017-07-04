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

use Cawa\App\HttpFactory;

class HttpApp extends \Cawa\App\HttpApp
{
    use HttpFactory;

    /**
     * @return bool
     */
    public static function isSpf() : bool
    {
        return !is_null(self::request()->getHeader('x-spf-previous'));
    }

    /**
     * overide to handle redirect
     */
    public function end()
    {
        if (self::isSpf()) {
            if (self::response()->getHeader('Location')) {
                self::response()->addHeader('Content-Type', 'application/json; charset=utf-8');
                self::response()->setStatus(307);
                self::response()->setBody(json_encode([
                    'redirect' => self::response()->getHeader('Location'),
                ]));
                self::response()->removeHeader('Location');
            }
        }

        parent::end();
    }
}
